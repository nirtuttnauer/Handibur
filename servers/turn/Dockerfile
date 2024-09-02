FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    coturn \
    && rm -rf /var/lib/apt/lists/*

# Copy the configuration template
COPY turnserver.conf.template /etc/turnserver.conf.template

# Expose the necessary ports
EXPOSE 3478/udp
EXPOSE 5349/tcp

# Start the Coturn server with dynamic public IP injection
CMD ["/bin/bash", "-c", "envsubst < /etc/turnserver.conf.template > /etc/turnserver.conf && turnserver -c /etc/turnserver.conf"]