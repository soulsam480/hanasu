FROM node:18.17.1-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV NODE_ENV="production"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY . .

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --dev
RUN pnpm run api build

FROM base
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/api/node_modules /app/api/node_modules
COPY --from=build /app/api/dist /app/api/dist

EXPOSE 8080

CMD [ "node", "api/dist/index.js"]