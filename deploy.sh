#!/bin/bash

echo "🚀 Deploying Data Lake Uploader to Heroku..."

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI not found. Please install it first:"
    echo "   Mac: brew tap heroku/brew && brew install heroku"
    echo "   Windows: Download from https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Login to Heroku
echo "🔐 Logging into Heroku..."
heroku login

# Initialize git if needed
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit for Data Lake uploader"
fi

# Create Heroku app
echo "🏗️ Creating Heroku app..."
read -p "Enter your app name (e.g., my-data-lake-uploader): " APP_NAME
heroku create $APP_NAME

# Set environment variables
echo "⚙️ Setting up environment variables..."
read -p "Enter Azure Storage Account Name: " AZURE_ACCOUNT
read -s -p "Enter Azure Storage Account Key: " AZURE_KEY
echo
read -p "Enter Container Name (default: uploads): " CONTAINER
CONTAINER=${CONTAINER:-uploads}

heroku config:set AZURE_STORAGE_ACCOUNT_NAME=$AZURE_ACCOUNT
heroku config:set AZURE_STORAGE_ACCOUNT_KEY=$AZURE_KEY
heroku config:set AZURE_DATA_LAKE_CONTAINER=$CONTAINER

# Deploy
echo "🚀 Deploying to Heroku..."
git push heroku main

echo "✅ Deployment complete!"
echo "🌐 Your app is live at: https://$APP_NAME.herokuapp.com"
echo "📝 Update your WordPress plugin settings with this URL"