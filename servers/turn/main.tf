provider "aws" {
  region = "eu-central-1"  # Frankfurt region
}

resource "aws_instance" "coturn_server" {
  ami           = "ami-0a91cd140a1fc148a"  # Ubuntu Server 22.04 LTS AMI ID for Frankfurt
  instance_type = "t2.micro"  # Adjust based on your requirements

  key_name = "your-key-pair"  # Replace with your key pair name

  security_groups = [aws_security_group.coturn_sg.name]

  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y docker.io
              
              # Fetch the instance's public IP
              PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
              
              # Run the Docker container with the public IP passed as an environment variable
              docker run -d --name coturn-server -p 3478:3478/udp -p 5349:5349/tcp \
                -e PUBLIC_IP=$PUBLIC_IP your-dockerhub-username/coturn-server
              EOF

  tags = {
    Name = "DockerCoturnServer"
  }
}

resource "aws_security_group" "coturn_sg" {
  name        = "coturn_sg"
  description = "Allow traffic to Coturn server"

  ingress {
    from_port   = 3478
    to_port     = 3478
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 5349
    to_port     = 5349
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "CoturnSG"
  }
}

output "public_ip" {
  value = aws_instance.coturn_server.public_ip
}