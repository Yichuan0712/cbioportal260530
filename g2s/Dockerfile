# ================================
# Base image
# ================================
FROM ubuntu:20.04
ENV DEBIAN_FRONTEND=noninteractive
ENV MAVEN_VERSION=3.8.8
ENV MAVEN_HOME=/opt/maven

# ================================
# Install Java 8 (matches your project)
# ================================
RUN apt-get update && apt-get install -y \
    openjdk-8-jdk \
    wget \
    git \
    curl \
    unzip \
    ca-certificates \
    build-essential \
    mysql-client \
    blast2 \
    rsync \
    && rm -rf /var/lib/apt/lists/*

# ================================
# Set JAVA_HOME for Java 8
# ================================
ENV JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64
ENV PATH=$MAVEN_HOME/bin:$JAVA_HOME/bin:$PATH

# ================================
# Install Maven
# ================================
RUN wget https://archive.apache.org/dist/maven/maven-3/$MAVEN_VERSION/binaries/apache-maven-$MAVEN_VERSION-bin.tar.gz \
    && tar -xzf apache-maven-$MAVEN_VERSION-bin.tar.gz -C /opt \
    && ln -s /opt/apache-maven-$MAVEN_VERSION $MAVEN_HOME \
    && rm apache-maven-$MAVEN_VERSION-bin.tar.gz

# ================================
# Set working directory and copy project
# ================================
WORKDIR /app
COPY . /app

# ================================
# Build all modules (skip tests)
# ================================
RUN mvn clean package -DskipTests

# ================================
# Expose ports for each module
# ================================
EXPOSE 8081 8082 5443

CMD ["sh", "-c", "\
    java -Xmx7000m -jar pdb-alignment-api/target/pdb-alignment-api-0.1.0.jar --server.port=8081 & \
    java -Xmx7000m -jar pdb/target/pdb-0.1.0.war --server.port=8082 & \
    java -Xmx7000m -jar pdb-alignment-web/target/pdb-alignment-web-0.1.0.war --server.port=5443 & \
    wait \
"]
