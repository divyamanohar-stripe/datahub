# Developing DataHub at Stripe

## CI Builds
Internal Stripe CI builds are driven by the configuration in ``stripe-build.yaml``, ``jenkins-build.sh`` and ``Dockerfile``.
Any internal PRs created against the [DataHub fork](http://go/forks/datahub) kicks off a CI build.
Some tweaks to the process to get things to work at Stripe:
* Filter out really large files from the docs/imgs directory. GHE has a file limit of 25MB and that directory contains a lot 
  of files much bigger. To be able to push changes to our internal fork, we need to filter these out. Anytime we rebase from upstream we need to:
```bash
$ git filter-repo --path-glob 'docs/imgs/*' --invert-paths --force
```
(This removes the files in docs/imgs and also rewrites all prior commits that include them. You'll need the `git-filter-repo` package installed via HomeBrew)
* Override the NPM / Yarn registries used in ``dataweb-web-react/build.gradle`` to point to Stripe's 
  [internal registries](https://confluence.corp.stripe.com/display/PRODINFRA/Artifactory%3A+User+Guide#Artifactory:UserGuide-NPM). 
  As part of this, we have also regenerated the ``yarn.lock`` file to ensure determinism between builds on which package versions our binaries end up with. 
  Every upstream rebase requires us to regenerate the yarn.lock file using the command:
```bash
$ ./gradlew :datahub-web-react:yarnInstall
```

At the moment, we only build the generalized metadata service (gms) and frontend service as those are the two services we plan
to deploy. 

## Run Stripe builds locally in Docker
While making changes to DataHub there's a couple of options available to test your changes.
* Use the process described in the upstream project - [Local Development](https://datahubproject.io/docs/developers)
* Run using the Stripe scripts - This is useful if you're tweaking the deploy scripts / configs and want to confirm things work. Couple of options here: 
  * Make your changes, push to GHE. Once the build is successful, you will find your image in our [container repo](https://amp.qa.corp.stripe.com/containers/northwest/stripe-qa/stripe-private-oss-forks/datahub).
    Pull this image down locally and give it a tag using the following commands:
    ```bash
    $ sc docker pull containers.global.qa.stripe.io/stripe-qa/stripe-private-oss-forks/datahub@sha256:3b5b50dbae40e04cc4c74deff5ed9cff7f0775e58fb389fa93332d2368e9d2cc
    $ docker images | grep containers.global.qa.stripe.io
      containers.global.qa.stripe.io/stripe-qa/stripe-private-oss-forks/datahub   sc-docker-pull   5494360d4482   35 minutes ago   1.39GB
    $ docker tag 5494360d4482 stripe/datahub:latest
    ```
  * Make your changes, build your image locally:
    ```bash
    $ ./docker-compose-build.sh
    ...
    ```
  In both these cases, you end up with an image - `stripe/datahub:latest`. When you've got your Docker image pulled / built, you can run DataHub using:
  ```bash
  $ docker compose -p datahub -f stripe-docker-compose.yml up -d
  ```
Note:
* You need to have your Docker daemon running
* In the `docker-compose-build.sh`, we use [Space Commander](https://confluence.corp.stripe.com/display/CLOUDMGMT/Space+Commander) to pull the Stripe Ubuntu image
