FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    boto3==1.34.0 \
    Pillow==10.3.0 \
    numpy==1.26.4 \
    opencv-python-headless==4.9.0.80

COPY . .

CMD ["python", "mock_pi.py"]