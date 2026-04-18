FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    cmake \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    awsiotsdk==1.22.0 \
    boto3==1.34.0 \
    Pillow==10.3.0

COPY . .

CMD ["python", "mock_pi.py"]