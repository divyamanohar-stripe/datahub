FROM stripe/veneur:6.0.0 AS veneur

FROM containers.global.prod.stripe.io/stripe/build/ubuntu-20.04:latest

RUN apt-get update && apt-get install -y gradle && rm -rf /var/lib/apt/lists/*
RUN add-apt-repository ppa:openjdk-r/ppa && apt-get update && apt-get install -y openjdk-8-jdk-headless zip && update-java-alternatives -s java-1.8.0-openjdk-amd64
ENV JAVA_HOME /usr/lib/jvm/java-8-openjdk-amd64/
ENV PATH $JAVA_HOME/bin:$PATH
RUN export JAVA_HOME

WORKDIR /src
ENV PATH $PATH:/src/

CMD /src/jenkins-build.sh
