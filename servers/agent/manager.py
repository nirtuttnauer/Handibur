import subprocess
import time
import sys
import signal

# List to hold the client processes
processes = []

# Number of client instances you want to run
NUM_CLIENTS = 5

def start_clients():
    global processes
    # Start the client scripts
    for i in range(NUM_CLIENTS):
        print(f"Starting WebRTC client #{i + 1}...")
        process = subprocess.Popen([sys.executable, "aiserver.py"])
        processes.append(process)

def restart_client(index):
    global processes
    print(f"Restarting WebRTC client #{index + 1}...")
    process = subprocess.Popen([sys.executable, "aiserver.py"])
    processes[index] = process

def handle_exit(signum, frame):
    print("Received exit signal, shutting down all clients...")
    for process in processes:
        if process is not None:
            process.terminate()
            process.wait()
    sys.exit(0)

def main():
    global processes

    # Handle termination signals
    signal.signal(signal.SIGINT, handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)

    # Start the initial set of clients
    start_clients()

    while True:
        # Monitor the client processes
        for i, process in enumerate(processes):
            if process.poll() is not None:  # Process has exited
                print(f"Client #{i + 1} exited with code {process.returncode}. Restarting in 5 seconds...")
                time.sleep(5)
                restart_client(i)

        # Sleep for a short duration before checking the processes again
        time.sleep(1)

if __name__ == "__main__":
    main()