#!/usr/bin/env bash
# stop script on error

source testenv/bin/activate

set -e

# Check for python 3
if ! python3 --version &> /dev/null; then
  printf "\nERROR: python3 must be installed.\n"
  exit 1
fi

# Check to see if root CA file exists, download if not
if [ ! -f ./root-CA.crt ]; then
  printf "\nDownloading AWS IoT Root CA certificate from AWS...\n"
  curl https://www.amazontrust.com/repository/AmazonRootCA1.pem > root-CA.crt
fi

# Check to see if AWS Device SDK for Python is already installed, install if not
if ! python3 -c "import awsiot" &> /dev/null; then
  printf "\nInstalling AWS SDK...\n"
  python3 -m pip install -r requirements.txt
  result=$?
  if [ $result -ne 0 ]; then
    printf "\nERROR: Failed to install SDK.\n"
    exit $result
  fi
fi

# run pub/sub sample app using certificates downloaded in package
printf "\nRunning pub/sub sample application...\n"
python3 script/mqtt5_message_script.py --endpoint a2g903od28ne6b-ats.iot.us-east-2.amazonaws.com --cert mock-certificate.pem.crt --key mock-private.pem.key --client_id mockDevice --topic parking/state_update --count 1 --message '{ "message": "Yo whats up?" }'
