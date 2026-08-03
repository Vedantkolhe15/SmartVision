import os

# =========================================================
# MEMORY OPTIMIZATION - MUST BE BEFORE TORCH IMPORT
# =========================================================

os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import gc
import shutil
import uuid

# =========================================================
# BASE DIRECTORY
# =========================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

MODEL_PATH = os.path.join(
    BASE_DIR,
    "yolov8n.pt"
)

# =========================================================
# IMPORT TORCH
# =========================================================

import torch

torch.set_num_threads(1)

# =========================================================
# FASTAPI IMPORTS
# =========================================================

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

from ultralytics import YOLO

# =========================================================
# APP
# =========================================================

app = FastAPI(
    title="SmartVision AI",
    description="AI Powered Image Recognition System",
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
# LOAD YOLO MODEL ONCE
# =========================================================

print(
    "===== LOADING YOLO MODEL ====="
)

print(
    "Model path:",
    MODEL_PATH
)

model = YOLO(
    MODEL_PATH
)

print(
    "===== YOLO MODEL LOADED SUCCESSFULLY ====="
)

# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():

    return {
        "message":
        "SmartVision AI Backend is Running"
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
# IMAGE ANALYSIS
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

    if extension not in allowed_extensions:

        return JSONResponse(

            status_code=400,

            content={

                "error":
                "Only JPG, JPEG, PNG and WEBP images are allowed."

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
        # SAVE IMAGE
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

        # =================================================
        # CLOSE UPLOAD FILE
        # =================================================

        await file.close()

        print(
            "Uploaded image saved."
        )

        # =================================================
        # YOLO INFERENCE
        # =================================================

        print(
            "===== STARTING YOLO INFERENCE ====="
        )

        # IMPORTANT:
        # stream=True prevents storing unnecessary
        # prediction results in a large list.

        results = model.predict(

            source=upload_path,

            save=False,

            stream=True,

            verbose=False,

            imgsz=224,

            device="cpu",

            conf=0.35,

            max_det=3

        )

        # =================================================
        # RESPONSE DATA
        # =================================================

        detections = []

        object_counts = {}

        # =================================================
        # PROCESS STREAMING RESULTS
        # =================================================

        for result in results:

            print(
                "Processing YOLO result..."
            )

            # =============================================
            # SAVE RESULT IMAGE
            # =============================================

            result.save(

                filename=result_path

            )

            # =============================================
            # PROCESS DETECTIONS
            # =============================================

            if result.boxes is not None:

                for box in result.boxes:

                    class_id = int(

                        box.cls[0]

                    )

                    confidence = float(

                        box.conf[0]

                    )

                    class_name = (

                        model.names[

                            class_id

                        ]

                    )

                    detections.append({

                        "object":

                        class_name,

                        "confidence":

                        round(

                            confidence * 100,

                            2

                        )

                    })

                    object_counts[

                        class_name

                    ] = object_counts.get(

                        class_name,

                        0

                    ) + 1

            # =============================================
            # CLEAN CURRENT RESULT
            # =============================================

            del result

            gc.collect()

        print(
            "===== YOLO INFERENCE COMPLETED ====="
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

        del results

        gc.collect()

        # =================================================
        # SUCCESS
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

                + result_filename

            }

        )

    # =====================================================
    # ERROR HANDLING
    # =====================================================

    except Exception as e:

        print(

            "===== ERROR =====",

            str(e)

        )

        # =================================================
        # DELETE UPLOAD FILE
        # =================================================

        if os.path.exists(

            upload_path

        ):

            os.remove(

                upload_path

            )

        # =================================================
        # MEMORY CLEANUP
        # =================================================

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