FROM stripe/veneur:6.0.0 AS veneur

FROM containers.global.prod.stripe.io/stripe/build/ubuntu-20.04:latest

RUN apt-get update && apt-get install -y gradle && rm -rf /var/lib/apt/lists/*
RUN add-apt-repository ppa:openjdk-r/ppa && apt-get update && apt-get install -y openjdk-8-jdk-headless zip jq && update-java-alternatives -s java-1.8.0-openjdk-amd64
ENV JAVA_HOME /usr/lib/jvm/java-8-openjdk-amd64/
ENV PATH $JAVA_HOME/bin:$PATH
RUN export JAVA_HOME

ENV \
    PATH=/venv/bin:$PATH \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_INDEX_URL=https://artifactory-content.stripe.build/artifactory/api/pypi/pypi-safe/simple \
    PIP_NO_CACHE_DIR=1
RUN python3 -m venv /venv && pip install wheel setuptools==57.5.0

WORKDIR /src
ENV PATH $PATH:/src/

CMD /src/jenkins-build.sh
