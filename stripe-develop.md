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
