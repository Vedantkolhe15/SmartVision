import os

# =========================================================
# MEMORY OPTIMIZATION
# MUST BE BEFORE NUMPY / ONNX RUNTIME IMPORT
# =========================================================

os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import gc
import shutil
import uuid

import cv2
import numpy as np
import onnxruntime as ort

from fastapi import (
    FastAPI,
    UploadFile,
    File
)

from fastapi.middleware.cors import (
    CORSMiddleware
)

from fastapi.responses import (
    JSONResponse
)

from fastapi.staticfiles import (
    StaticFiles
)


# =========================================================
# BASE DIRECTORY
# =========================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)


# =========================================================
# ONNX MODEL PATH
# =========================================================

MODEL_PATH = os.path.join(
    BASE_DIR,
    "yolov8n.onnx"
)


# =========================================================
# YOLO CLASS NAMES - COCO 80 CLASSES
# =========================================================

CLASS_NAMES = [
    "person",
    "bicycle",
    "car",
    "motorcycle",
    "airplane",
    "bus",
    "train",
    "truck",
    "boat",
    "traffic light",
    "fire hydrant",
    "stop sign",
    "parking meter",
    "bench",
    "bird",
    "cat",
    "dog",
    "horse",
    "sheep",
    "cow",
    "elephant",
    "bear",
    "zebra",
    "giraffe",
    "backpack",
    "umbrella",
    "handbag",
    "tie",
    "suitcase",
    "frisbee",
    "skis",
    "snowboard",
    "sports ball",
    "kite",
    "baseball bat",
    "baseball glove",
    "skateboard",
    "surfboard",
    "tennis racket",
    "bottle",
    "wine glass",
    "cup",
    "fork",
    "knife",
    "spoon",
    "bowl",
    "banana",
    "apple",
    "sandwich",
    "orange",
    "broccoli",
    "carrot",
    "hot dog",
    "pizza",
    "donut",
    "cake",
    "chair",
    "couch",
    "potted plant",
    "bed",
    "dining table",
    "toilet",
    "tv",
    "laptop",
    "mouse",
    "remote",
    "keyboard",
    "cell phone",
    "microwave",
    "oven",
    "toaster",
    "sink",
    "refrigerator",
    "book",
    "clock",
    "vase",
    "scissors",
    "teddy bear",
    "hair drier",
    "toothbrush"
]


# =========================================================
# SETTINGS
# =========================================================

INPUT_SIZE = 224

CONFIDENCE_THRESHOLD = 0.35

IOU_THRESHOLD = 0.45

MAX_DETECTIONS = 3


# =========================================================
# APP
# =========================================================

app = FastAPI(

    title="SmartVision AI",

    description=(
        "AI Powered Image Recognition System "
        "using YOLOv8 ONNX Runtime"
    ),

    version="1.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(

    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]

)


# =========================================================
# FOLDERS
# =========================================================

UPLOAD_FOLDER = os.path.join(

    BASE_DIR,

    "uploads"

)


RESULT_FOLDER = os.path.join(

    BASE_DIR,

    "results"

)


os.makedirs(

    UPLOAD_FOLDER,

    exist_ok=True

)


os.makedirs(

    RESULT_FOLDER,

    exist_ok=True

)


# =========================================================
# STATIC RESULT IMAGES
# =========================================================

app.mount(

    "/results",

    StaticFiles(

        directory=RESULT_FOLDER

    ),

    name="results"

)


# =========================================================
# LOAD ONNX MODEL ONCE
# =========================================================

print(
    "===== LOADING ONNX MODEL ====="
)

print(
    "Model path:",
    MODEL_PATH
)


# =========================================================
# ONNX RUNTIME SESSION OPTIONS
# =========================================================

session_options = ort.SessionOptions()

session_options.intra_op_num_threads = 1

session_options.inter_op_num_threads = 1

session_options.graph_optimization_level = (
    ort.GraphOptimizationLevel.ORT_ENABLE_ALL
)


# =========================================================
# CREATE ONNX SESSION
# =========================================================

session = ort.InferenceSession(

    MODEL_PATH,

    sess_options=session_options,

    providers=[
        "CPUExecutionProvider"
    ]

)


INPUT_NAME = session.get_inputs()[0].name


print(
    "===== ONNX MODEL LOADED SUCCESSFULLY ====="
)

print(
    "Input name:",
    INPUT_NAME
)


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():

    return {

        "message":
        "SmartVision AI Backend is Running",

        "engine":
        "YOLOv8 ONNX Runtime",

        "status":
        "healthy"

    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health():

    return {

        "status":
        "healthy"

    }


# =========================================================
# IMAGE PREPROCESSING
# =========================================================

def preprocess_image(
    image
):

    resized = cv2.resize(

        image,

        (
            INPUT_SIZE,
            INPUT_SIZE
        )

    )


    rgb = cv2.cvtColor(

        resized,

        cv2.COLOR_BGR2RGB

    )


    input_tensor = (

        rgb.astype(
            np.float32
        )

        / 255.0

    )


    input_tensor = np.transpose(

        input_tensor,

        (
            2,
            0,
            1
        )

    )


    input_tensor = np.expand_dims(

        input_tensor,

        axis=0

    )


    return input_tensor


# =========================================================
# YOLO ONNX INFERENCE
# =========================================================

def run_inference(

    image

):

    original_height, original_width = (

        image.shape[:2]

    )


    input_tensor = preprocess_image(

        image

    )


    # =====================================================
    # ONNX INFERENCE
    # =====================================================

    outputs = session.run(

        None,

        {

            INPUT_NAME:

            input_tensor

        }

    )


    predictions = outputs[0]


    # =====================================================
    # REMOVE BATCH DIMENSION
    # =====================================================

    if predictions.ndim == 3:

        predictions = predictions[0]


    # =====================================================
    # TRANSPOSE OUTPUT
    # YOLOv8 ONNX:
    # (84, 1029)
    # -> (1029, 84)
    # =====================================================

    if (

        predictions.shape[0]

        <

        predictions.shape[1]

    ):

        predictions = predictions.T


    boxes = []

    scores = []

    class_ids = []


    # =====================================================
    # SCALE FACTORS
    # =====================================================

    scale_x = (

        original_width

        /

        INPUT_SIZE

    )


    scale_y = (

        original_height

        /

        INPUT_SIZE

    )


    # =====================================================
    # PROCESS PREDICTIONS
    # =====================================================

    for prediction in predictions:

        x_center = float(

            prediction[0]

        )


        y_center = float(

            prediction[1]

        )


        width = float(

            prediction[2]

        )


        height = float(

            prediction[3]

        )


        class_scores = (

            prediction[4:]

        )


        class_id = int(

            np.argmax(

                class_scores

            )

        )


        confidence = float(

            class_scores[

                class_id

            ]

        )


        if (

            confidence

            <

            CONFIDENCE_THRESHOLD

        ):

            continue


        # =================================================
        # CONVERT CENTER FORMAT
        # TO TOP-LEFT FORMAT
        # =================================================

        x1 = int(

            (

                x_center

                -

                width / 2

            )

            *

            scale_x

        )


        y1 = int(

            (

                y_center

                -

                height / 2

            )

            *

            scale_y

        )


        box_width = int(

            width

            *

            scale_x

        )


        box_height = int(

            height

            *

            scale_y

        )


        boxes.append(

            [

                x1,

                y1,

                box_width,

                box_height

            ]

        )


        scores.append(

            confidence

        )


        class_ids.append(

            class_id

        )


    # =====================================================
    # NMS
    # =====================================================

    indices = cv2.dnn.NMSBoxes(

        boxes,

        scores,

        CONFIDENCE_THRESHOLD,

        IOU_THRESHOLD

    )


    detections = []

    object_counts = {}


    # =====================================================
    # DRAW RESULTS
    # =====================================================

    if len(indices) > 0:

        indices = np.array(

            indices

        ).flatten()


        # =================================================
        # LIMIT NUMBER OF DETECTIONS
        # =================================================

        indices = indices[

            :MAX_DETECTIONS

        ]


        for index in indices:

            x, y, w, h = (

                boxes[index]

            )


            confidence = (

                scores[index]

            )


            class_id = (

                class_ids[index]

            )


            class_name = (

                CLASS_NAMES[

                    class_id

                ]

            )


            # =============================================
            # DETECTION RESPONSE
            # =============================================

            detections.append(

                {

                    "object":

                    class_name,


                    "confidence":

                    round(

                        confidence

                        *

                        100,

                        2

                    )

                }

            )


            # =============================================
            # OBJECT COUNTS
            # =============================================

            object_counts[

                class_name

            ] = (

                object_counts.get(

                    class_name,

                    0

                )

                +

                1

            )


            # =============================================
            # DRAW BOUNDING BOX
            # =============================================

            cv2.rectangle(

                image,

                (

                    x,

                    y

                ),

                (

                    x + w,

                    y + h

                ),

                (

                    0,

                    255,

                    0

                ),

                2

            )


            # =============================================
            # LABEL
            # =============================================

            label = (

                f"{class_name} "

                f"{confidence * 100:.2f}%"

            )


            cv2.putText(

                image,

                label,

                (

                    x,

                    max(

                        y - 10,

                        20

                    )

                ),

                cv2.FONT_HERSHEY_SIMPLEX,

                0.6,

                (

                    0,

                    255,

                    0

                ),

                2

            )


    return (

        detections,

        object_counts,

        image

    )


# =========================================================
# IMAGE ANALYSIS ENDPOINT
# =========================================================

@app.post("/upload-image")
async def upload_image(

    file: UploadFile = File(...)

):

    print(
        "===== UPLOAD REQUEST RECEIVED ====="
    )


    unique_id = (

        uuid.uuid4().hex[:8]

    )


    # =====================================================
    # VALIDATE FILE
    # =====================================================

    if not file.filename:

        return JSONResponse(

            status_code=400,

            content={

                "error":
                "No file selected."

            }

        )


    extension = os.path.splitext(

        file.filename

    )[1].lower()


    allowed_extensions = [

        ".jpg",

        ".jpeg",

        ".png",

        ".webp"

    ]


    if (

        extension

        not in

        allowed_extensions

    ):

        return JSONResponse(

            status_code=400,

            content={

                "error":
                (
                    "Only JPG, JPEG, PNG "
                    "and WEBP images are allowed."
                )

            }

        )


    # =====================================================
    # FILE PATHS
    # =====================================================

    original_filename = (

        file.filename

    )


    safe_filename = (

        f"{unique_id}"

        f"{extension}"

    )


    upload_path = os.path.join(

        UPLOAD_FOLDER,

        safe_filename

    )


    result_filename = (

        f"result_"

        f"{safe_filename}"

    )


    result_path = os.path.join(

        RESULT_FOLDER,

        result_filename

    )


    try:

        # =================================================
        # SAVE UPLOADED IMAGE
        # =================================================

        print(

            "Saving uploaded image..."

        )


        with open(

            upload_path,

            "wb"

        ) as buffer:

            shutil.copyfileobj(

                file.file,

                buffer

            )


        await file.close()


        print(

            "Uploaded image saved."

        )


        # =================================================
        # LOAD IMAGE
        # =================================================

        print(

            "Loading image..."

        )


        image = cv2.imread(

            upload_path

        )


        if image is None:

            raise ValueError(

                "Unable to read uploaded image."

            )


        # =================================================
        # RUN ONNX INFERENCE
        # =================================================

        print(

            "===== STARTING ONNX INFERENCE ====="

        )


        (

            detections,

            object_counts,

            result_image

        ) = run_inference(

            image

        )


        print(

            "===== ONNX INFERENCE COMPLETED ====="

        )


        # =================================================
        # SAVE RESULT IMAGE
        # =================================================

        cv2.imwrite(

            result_path,

            result_image

        )


        # =================================================
        # DELETE UPLOADED IMAGE
        # =================================================

        if os.path.exists(

            upload_path

        ):

            os.remove(

                upload_path

            )


        # =================================================
        # CLEAN MEMORY
        # =================================================

        del image

        del result_image

        gc.collect()


        # =================================================
        # SUCCESS RESPONSE
        # =================================================

        print(

            "===== SUCCESS RESPONSE ====="

        )


        return JSONResponse(

            content={

                "message":

                "Image analyzed successfully",


                "filename":

                original_filename,


                "detections":

                detections,


                "object_counts":

                object_counts,


                "result_image":

                "/results/"

                +

                result_filename

            }

        )


    except Exception as e:

        print(

            "===== ERROR =====",

            str(e)

        )


        # =================================================
        # DELETE UPLOADED FILE
        # =================================================

        if os.path.exists(

            upload_path

        ):

            os.remove(

                upload_path

            )


        gc.collect()


        return JSONResponse(

            status_code=500,

            content={

                "error":

                "Image analysis failed",


                "details":

                str(e)

            }

        )