# Directories
NODE_DIR = node_app
PYTHON_DIR = python_app

# Default target (runs when you type "make")
all: start

# Install dependencies
install:
	@pip install -r $(PYTHON_DIR)/requirements.txt
	@cd $(NODE_DIR) && npm install

# Run all applications
start:
	@concurrently "npm run dev --prefix $(NODE_DIR)" "cd $(PYTHON_DIR) && python watcher.py"

# Run Python script
run-python:
	@cd $(PYTHON_DIR) && python watcher.py

# Start Node.js application
run-node:
	@cd $(NODE_DIR) && npm run dev

# Command to stop all Node.js and Python processes
stop:
	@echo "Stopping all Node.js and Python processes..."
	@taskkill /F /IM node.exe /T || echo "Node.js process not found."
	@taskkill /F /IM python.exe /T || echo "Python process not found."
	@echo "All Node.js and Python processes have been terminated."~