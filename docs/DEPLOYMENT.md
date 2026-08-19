# Deployment guide

Final Vora Web must run as a container or long-lived Node.js service. A static host or short serverless function is not enough: the backend starts `yt-dlp`, can run FFmpeg, streams large responses, and keeps short-lived job state in memory.

## Capacity planning

Temporary storage should be at least:

```text
DOWNLOAD_MAX_CONCURRENT × DOWNLOAD_MAX_FILE_MB × 2
```

The factor of two leaves room for separate video/audio streams and their merged output. FFmpeg CPU, source traffic, and browser egress are the main costs. Start with one concurrent job on a 512 MB host.

This release has a bounded **single-container in-memory store**. Keep one replica. For multiple replicas, move rate limits/jobs to Redis, media to bounded object storage, and route one-time downloads independently of a particular instance.

## Render Blueprint

1. Fork or open the repository in your GitHub account.
2. In Render, choose **New → Blueprint** and select the repository.
3. Review `render.yaml`; it uses the Dockerfile and `/api/health`.
4. Update `NEXT_PUBLIC_SITE_URL` to the actual Render/custom HTTPS origin. This variable affects build-time metadata, so trigger a new build.
5. Deploy and wait for the Docker build plus cold start.
6. Open `/api/health`. Both tools should report `available: true`.
7. Test a permitted small public file before sharing the service.

Render injects `PORT`; `server.js` binds to `0.0.0.0`. Free instances sleep after 15 minutes, lose filesystem/in-memory jobs on sleep or restart, have 0.1 CPU/512 MB RAM, and can take about a minute to wake. As of the research date, new Hobby workspaces include only 5 GB outbound per month. See [hosting research](./HOSTING_RESEARCH.md) before exposing the service.

Optional cookies on Render should be a **secret file**, not an environment variable containing cookie data. Mount a Netscape-format file, set `YT_DLP_COOKIES` to that absolute mounted path, and never print or commit it. Optional proxy credentials belong in a secret `YT_DLP_PROXY` value.

## Oracle Cloud Always Free VM

Oracle is operationally harder but offers the strongest free resources when capacity is available.

1. Create an Always Free-eligible Ubuntu ARM64 Ampere A1 VM in the tenancy’s home region (1–2 OCPU and at least 4 GB RAM is a practical starting point). Confirm the Console labels the shape and boot volume **Always Free-eligible**.
2. Add an ingress security-list/network-security-group rule for TCP 80/443. Keep SSH restricted to your IP. Do **not** expose the application’s internal port publicly if using a reverse proxy.
3. Connect by SSH, patch the VM, and install Docker Engine using [Docker’s official Ubuntu instructions](https://docs.docker.com/engine/install/ubuntu/).
4. Clone the repository and build:

   ```bash
   git clone https://github.com/Uzair-khan-Me/Final-Vora-Web.git
   cd Final-Vora-Web
   docker build --pull \
     --build-arg NEXT_PUBLIC_SITE_URL=https://downloads.example.com \
     -t final-vora-web:latest .
   docker run -d --name final-vora-web \
     --restart unless-stopped \
     --read-only \
     --tmpfs /tmp:rw,noexec,nosuid,size=1g,uid=1001,gid=1001 \
     -p 127.0.0.1:3000:3000 \
     -e NEXT_PUBLIC_SITE_URL=https://downloads.example.com \
     -e DOWNLOAD_MAX_CONCURRENT=2 \
     -e DOWNLOAD_MAX_FILE_MB=250 \
     final-vora-web:latest
   ```

5. Put Caddy or nginx in front for TLS. Preserve streaming, disable response buffering on `/api/download/`, set a request timeout longer than `DOWNLOAD_TIMEOUT_SECONDS`, and avoid logging JSON bodies.
6. Configure DNS, obtain HTTPS, and verify `/api/health`.
7. Add unattended security updates, Docker log rotation, filesystem/egress monitoring, backups of configuration only, and an abuse/takedown contact. Media files are intentionally not persistent.
8. Pull, rebuild, and restart at least monthly or immediately when `yt-dlp` announces a source breakage/security fix.

Always Free capacity can be unavailable, account/card verification can be required, and idle VMs can be reclaimed. The multi-architecture image builds on ARM64 and AMD64.

## Google Cloud Run

Cloud Run is technically suitable for controlled use, not free high-volume egress.

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_SITE_URL=https://YOUR_DOMAIN,_IMAGE=REGION-docker.pkg.dev/PROJECT/final-vora/web:latest
gcloud run deploy final-vora-web \
  --image REGION-docker.pkg.dev/PROJECT/final-vora/web:latest \
  --region REGION \
  --allow-unauthenticated \
  --port 3000 \
  --cpu 2 \
  --memory 2Gi \
  --concurrency 2 \
  --max-instances 1 \
  --timeout 900 \
  --set-env-vars DOWNLOAD_MAX_CONCURRENT=2,DOWNLOAD_MAX_FILE_MB=250,NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN
```

Key constraints:

- A billing account is required even when usage falls inside the Cloud Run free allowance.
- Internet egress is billed separately.
- The writable filesystem and in-memory jobs are instance-local and ephemeral.
- Keep `--max-instances 1` for this architecture. Horizontal scaling requires shared state.
- Cloud Run requests can be configured up to 60 minutes; this example uses 15 minutes.
- Set an egress budget/alert, but understand alerts are not always hard spending caps.
- Build-time `NEXT_PUBLIC_SITE_URL` must be present when Next.js builds. If Cloud Build does not pass it, build the image with the final value or use the deployment origin as the initial canonical.

Cloud Run may use datacenter addresses challenged by YouTube. Cookies and proxies can be mounted/configured through Secret Manager, but must be authorized and must never be copied into the image.

## Generic Docker VPS

Minimum practical starting point: 1–2 vCPU, 2 GB RAM, 2 GB free temporary disk, a current Linux kernel, and a measured egress plan.

```bash
docker build --pull \
  --build-arg NEXT_PUBLIC_SITE_URL=https://downloads.example.com \
  -t final-vora-web:1.0.0 .
docker run -d --name final-vora-web \
  --restart unless-stopped \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=2g,uid=1001,gid=1001 \
  --env-file /opt/final-vora/final-vora.env \
  -p 127.0.0.1:3000:3000 \
  final-vora-web:1.0.0
```

Use a reverse proxy for HTTPS and request controls. Do not mount a permanent media volume. If using a cookie file, mount only that file read-only:

```bash
-v /opt/final-vora/secrets/cookies.txt:/run/secrets/yt-cookies.txt:ro \
-e YT_DLP_COOKIES=/run/secrets/yt-cookies.txt
```

The file must be in Netscape cookie-file format. Restrict it to the service owner (`chmod 600` on the host), rotate it if exposed, and never commit or paste it into issues/logs.

## Post-deployment checks

```bash
curl -fsS https://YOUR_DOMAIN/api/health
curl -fsS https://YOUR_DOMAIN/robots.txt
curl -fsS https://YOUR_DOMAIN/sitemap.xml
```

Then run the mock integration suite locally, submit one small permitted public direct-media link, submit a private-network URL and confirm `PRIVATE_URL`, verify one direct stream and one FFmpeg job, cancel a merge, and inspect that temporary directories disappear. Confirm rate limiting and monitor egress before public announcement.
