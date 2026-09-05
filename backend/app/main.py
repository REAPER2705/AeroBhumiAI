"""FastAPI main application entry point for AeroBhumiAI backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import route modules
from app.routes import spatial, parcels, upload, audit, reports

app = FastAPI(
    title="AeroBhumiAI Backend",
    description="Geospatial AI platform for spatial pre-validation of construction",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(spatial.router)
app.include_router(parcels.router)
app.include_router(upload.router)
app.include_router(audit.router)
app.include_router(reports.router)


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
