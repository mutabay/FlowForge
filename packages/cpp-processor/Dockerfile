FROM gcc:13 AS build
WORKDIR /app
RUN apt-get update && apt-get install -y cmake
COPY . .
RUN mkdir build && cd build && cmake .. && cmake --build .

FROM alpine:3.19 AS runtime
COPY --from=build /app/build/processor /app/processor
ENTRYPOINT ["/app/processor"]
