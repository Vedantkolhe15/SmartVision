import os
import gc
import shutil
import uuid

# =========================================================
# MEMORY OPTIMIZATION
# =========================================================

os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

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
# IMPORTS
# =========================================================

import torch

torch.set_num_threads(1)

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

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
    allow_headers=["*"],
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
# STATIC RESULTS
# =========================================================

app.mount(
    "/results",
    StaticFiles(
        directory=RESULT_FOLDER
    ),
    name="results"
)

# =========================================================
# LOAD MODEL ONCE
# =========================================================

print(
    "Loading YOLO model from:",
    MODEL_PATH
)

model = YOLO(
    MODEL_PATH
)

print(
    "YOLO model loaded successfully"
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
# HEALTH
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

    unique_id = uuid.uuid4().hex[:8]

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

        # =================================================
        # SAVE UPLOADED IMAGE
        # =================================================

        with open(
            upload_path,
            "wb"
        ) as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )

        # =================================================
        # RUN YOLO
        # =================================================

        print(
            "Starting YOLO inference..."
        )

        results = model(
            upload_path,
            imgsz=224,
            device="cpu",
            conf=0.35,
            max_det=3,
            verbose=False
        )

        print(
            "YOLO inference completed"
        )

        # =================================================
        # RESPONSE DATA
        # =================================================

        detections = []

        object_counts = {}

        # =================================================
        # PROCESS RESULT
        # =================================================

        for result in results:

            # =============================================
            # SAVE RESULT IMAGE
            # =============================================

            result.save(
                filename=result_path
            )

            # =============================================
            # PROCESS BOXES
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
        # MEMORY CLEANUP
        # =================================================

        del results

        gc.collect()

        # =================================================
        # SUCCESS
        # =================================================

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
    # =================================================

    except Exception as e:

        print(
            "ERROR:",
            str(e)
        )

        # =================================================
        # DELETE UPLOAD
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

        gc.collect()

        # =================================================
        # ERROR RESPONSE
        # =================================================

        return JSONResponse(

            status_code=500,

            content={

                "error":
                "Image analysis failed",

                "details":
                str(e)

            }

        )