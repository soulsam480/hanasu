FROM node:18.17.1-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV NODE_ENV="production"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY . .

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @hanasu/api

EXPOSE 8080

CMD [ "pnpm", "run", "api", "start" ]