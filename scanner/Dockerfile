FROM python:3.12-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY *.py ./
ENV PYTHONUNBUFFERED=1
VOLUME /data
EXPOSE 9393
CMD ["python", "scanner.py"]
