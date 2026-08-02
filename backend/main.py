import os
import gc
import shutil
import uuid

# Limit CPU threads to reduce memory usage on Render
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"

import torch

torch.set_num_threads(1)

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from ultralytics import YOLO


# ==============================
# APP SETUP
# ==============================

app = FastAPI(
    title="SmartVision AI",
    description="AI Powered Image Recognition System",
    version="1.0"
)


# ==============================
# CORS
# ==============================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================
# FOLDERS
# ==============================

UPLOAD_FOLDER = "uploads"
RESULT_FOLDER = "results"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)


# ==============================
# STATIC RESULTS
# ==============================

app.mount(
    "/results",
    StaticFiles(directory=RESULT_FOLDER),
    name="results"
)


# ==============================
# HOME
# ==============================

@app.get("/")
def home():

    return {
        "message": "SmartVision AI Backend is Running"
    }


# ==============================
# HEALTH CHECK
# ==============================

@app.get("/health")
def health():

    return {
        "status": "healthy"
    }


# ==============================
# IMAGE ANALYSIS
# ==============================

@app.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...)
):

    model = None
    results = None

    unique_id = uuid.uuid4().hex[:8]

    extension = os.path.splitext(
        file.filename
    )[1].lower()


    # ==============================
    # VALIDATE IMAGE
    # ==============================

    if extension not in [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    ]:

        return JSONResponse(

            status_code=400,

            content={

                "error":
                "Only JPG, JPEG, PNG and WEBP images are allowed."

            }

        )


    original_filename = file.filename

    safe_filename = (
        f"{unique_id}{extension}"
    )

    upload_path = os.path.join(
        UPLOAD_FOLDER,
        safe_filename
    )

    result_filename = (
        f"result_{safe_filename}"
    )

    result_path = os.path.join(
        RESULT_FOLDER,
        result_filename
    )


    try:

        # ==============================
        # SAVE IMAGE
        # ==============================

        with open(
            upload_path,
            "wb"
        ) as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )


        # ==============================
        # LOAD YOLO MODEL
        # ==============================

        print(
            "Loading YOLO model..."
        )

        model = YOLO(
            "yolov8n.pt"
        )

        print(
            "YOLO model loaded successfully"
        )


        # ==============================
        # RUN AI DETECTION
        # ==============================

        results = model.predict(

            source=upload_path,

            save=False,

            verbose=False,

            imgsz=320,

            device="cpu",

            max_det=10,

            conf=0.25

        )


        # ==============================
        # DETECTION DATA
        # ==============================

        detections = []

        object_counts = {}


        # ==============================
        # PROCESS RESULTS
        # ==============================

        for result in results:

            # Save result image

            result.save(
                filename=result_path
            )


            # Process detected objects

            for box in result.boxes:

                class_id = int(
                    box.cls[0]
                )

                confidence = float(
                    box.conf[0]
                )

                class_name = model.names[
                    class_id
                ]


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


        # ==============================
        # DELETE UPLOADED IMAGE
        # ==============================

        if os.path.exists(
            upload_path
        ):

            os.remove(
                upload_path
            )


        # ==============================
        # CLEAN MEMORY
        # ==============================

        del results

        del model

        gc.collect()


        # ==============================
        # RESPONSE
        # ==============================

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


    except Exception as e:

        print(
            "ERROR:",
            str(e)
        )


        # ==============================
        # DELETE UPLOADED FILE
        # ==============================

        if os.path.exists(
            upload_path
        ):

            os.remove(
                upload_path
            )


        # ==============================
        # CLEAN MEMORY
        # ==============================

        del results

        del model

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