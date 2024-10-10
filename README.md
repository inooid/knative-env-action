# ✨ Knative/Cloud Run .env Action

Deploying multiple apps with shared environment variables can be tedious to
manage. This GitHub action should help relieve some of the pains by:

- Easily managing env variables using `.env` files
- Substitutes environment variables used within the manifest

---

- [Usage](#usage)
- [Examples](#examples)
- [Customizing](#customizing)
  - [inputs](#inputs)
  - [outputs](#outputs)
- [Contributing](#contributing)

## Usage

```yml
name: Deploy

on:
  # Trigger the workflow on push or pull request,
  # but only for the main branch
  push:
    branches:
      - main
  # Replace pull_request with pull_request_target if you
  # plan to use this action with forks, see the Limitations section
  pull_request:
    branches:
      - main

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # ... all your google auth steps here

      - name: Generate service declaration
        uses: inooid/knative-env-action@0.1.0
        with:
          input: ./deploy/production-app.yaml
          target: my-container-name
          env_file: ./deploy/production.env
          output: /tmp/production-app.yaml

      # Example of actually deploying the cloud run app
      - name: Deploy app to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          region: us-east1
          metadata: /tmp/production-app.yaml
```

## Examples

### Deploy multiple apps using same env file

<details>
  <summary>`app.yaml`</summary>

```yaml
# app.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-test-schedulder
  labels:
    cloud.googleapis.com/location: us-east1
spec:
  template:
    spec:
      containers:
        - name: my-test-app
          image: my-image
          ports:
            - name: http1
              containerPort: 8080
```

</details>

<details>
  <summary>`scheduler.yaml`</summary>

```yaml
# scheduler.yaml
apiVersion: run.googleapis.com/v1
kind: Job
metadata:
  name: my-test-schedulder
  labels:
    cloud.googleapis.com/location: us-east1
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/execution-environment: gen2
    spec:
      taskCount: 1
      template:
        spec:
          containers:
            - name: my-test-schedulder
              image: my-image
              command: ./scheduler --limit 50
```

</details>

<details>
  <summary>`production.env`</summary>

```env
APP_URL=https://localhost
LOG_LEVEL=info

MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=sendgrid_api_key
MAIL_ENCRYPTION=tls
MAIL_FROM_NAME="John Smith"
MAIL_FROM_ADDRESS=from@example.com
```

</details>

```yml
name: Deploy

on:
  # Trigger the workflow on push or pull request,
  # but only for the main branch
  push:
    branches:
      - main
  # Replace pull_request with pull_request_target if you
  # plan to use this action with forks, see the Limitations section
  pull_request:
    branches:
      - main

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # ... all your google auth steps here

      - name: Generate app declaration
        uses: inooid/knative-env-action@0.1.0
        with:
          input: ./app.yaml
          target: my-test-app
          env_file: ./production.env
          output: /tmp/production-app.yaml

      # Example of actually deploying the cloud run app
      - name: Deploy app to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          region: us-east1
          metadata: /tmp/production-app.yaml

      - name: Generate job declaration
        uses: inooid/knative-env-action@0.1.0
        with:
          input: ./scheduler.yaml
          target: my-test-schedulder
          env_file: ./production.env
          output: /tmp/production-scheduler.yaml

      # Example of actually deploying the cloud run app
      - name: Deploy app to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          region: us-east1
          metadata: /tmp/production-scheduler.yaml
```

### Using env var substitution

<details>
  <summary>`app.yaml`</summary>

```yaml
# app.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ${APP_NAME}
  labels:
    cloud.googleapis.com/location: ${APP_LOCATION}
spec:
  template:
    spec:
      containers:
        - name: ${APP_NAME}
          image: ${APP_IMAGE}
          ports:
            - name: http1
              containerPort: 8080
```

```yml
name: Deploy

on:
  # Trigger the workflow on push or pull request,
  # but only for the main branch
  push:
    branches:
      - main
  # Replace pull_request with pull_request_target if you
  # plan to use this action with forks, see the Limitations section
  pull_request:
    branches:
      - main

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # ... all your google auth steps here

      - name: Generate app declaration
        uses: inooid/knative-env-action@0.1.0
        env:
          APP_NAME: ${{ vars.APP_NAME }}
          APP_LOCATION: ${{ vars.APP_LOCATION }}
          APP_IMAGE: ${{ vars.APP_IMAGE }} # Could be the output from the image build step
        with:
          input: ./app.yaml
          target: ${{ vars.APP_NAME }}
          env_file: ./production.env
          output: /tmp/production-app.yaml

      # Example of actually deploying the cloud run app
      - name: Deploy app to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          region: ${{ vars.APP_LOCATION }}
          metadata: /tmp/production-app.yaml
```

## Customizing

### inputs

The following inputs can be used as `step.with` keys:

| Name       | Type     | Required? | Description                                                               |
| ---------- | -------- | --------- | ------------------------------------------------------------------------- |
| `input`    | `String` | Yes       | The input path of the knative yaml file (e.g. `./app.yaml`)               |
| `target`   | `String` | Yes       | The name of the target container                                          |
| `env_file` | `String` | Yes       | The path to the `.env` file                                               |
| `output`   | `String` | Yes       | The output path of the generated knative yaml file (e.g. `/tmp/app.yaml`) |

### outputs

There are currently no outputs available

## Contributing

Want to contribute? Awesome! You can find information about contributing to this
project in the [CONTRIBUTING.md](/.github/CONTRIBUTING.md)
