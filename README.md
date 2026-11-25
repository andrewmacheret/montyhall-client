# montyhall-client

[![Build and deploy](https://github.com/andrewmacheret/montyhall-client/actions/workflows/deploy.yml/badge.svg)](https://github.com/andrewmacheret/montyhall-client/actions/workflows/deploy.yml) [![Canary](https://github.com/andrewmacheret/montyhall-client/actions/workflows/canary.yml/badge.svg)](https://github.com/andrewmacheret/montyhall-client/actions/workflows/canary.yml) [![License](https://img.shields.io/badge/license-MIT-lightgray.svg)](https://github.com/andrewmacheret/montyhall-client/blob/master/LICENSE.md)

A React game of the [Monty Hall problem](https://en.wikipedia.org/wiki/Monty_Hall_problem) with 3 to 10 doors, and running stats for each number of doors on whether staying or switching wins more cars. Dark theme only, styled to match [cube](https://github.com/andrewmacheret/cube).

Play it at [andrewmacheret.com/projects/montyhall](https://andrewmacheret.com/projects/montyhall/). The API is [montyhall-server-lambda](https://github.com/andrewmacheret/montyhall-server-lambda).

## Development

Built with [Vite](https://vite.dev/). Needs Node.js 24.

```bash
npm install

# dev server on http://localhost:5173, using the live API
npm run dev

# or against a local copy of montyhall-server-lambda
VITE_API_URL=http://localhost:8080 npm run dev

# production build in dist/
npm run build
```

The live API only allows requests from `https://andrewmacheret.com` and `http://localhost:5173` (CORS).

## Health check

[`/projects/montyhall/healthcheck/`](https://andrewmacheret.com/projects/montyhall/healthcheck/) checks the page and its scripts and styles, and the Monty Hall API's own health check. The Canary workflow (`.github/workflows/canary.yml`) opens it once a day, started by [andrewmacheret/canary](https://github.com/andrewmacheret/canary).

## Deploy

Pushes to `master` build the site, copy `dist/` to `s3://andrewmacheret.com/projects/montyhall`, and clear the CloudFront cache through GitHub Actions (see `.github/workflows/deploy.yml`). The workflow signs in to AWS with GitHub OIDC using the IAM role in the `AWS_ROLE_ARN` repo variable.
