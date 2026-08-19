# Container hosting research for Final Vora Web

**Research date:** 19 August 2026

**Workload examined:** one Next.js/Node container with `yt-dlp`, FFmpeg, a JavaScript runtime, outbound source traffic, temporary media files, long HTTP streams, and high egress relative to ordinary web pages.

Pricing and policy change. Re-check every linked official page immediately before deployment. “Free” below means an official recurring allowance was visible on the research date; it does not mean free forever.

## Executive recommendation

1. **Oracle Cloud Always Free Ampere A1 VM is the most practical no-monthly-compute-cost option** for a technically capable operator. It offers materially more CPU, RAM, disk, and outbound allowance than free PaaS instances and gives full Docker control. Capacity can be hard to obtain, idle free instances can be reclaimed, account verification is stricter, and the operator owns patching, firewalling, TLS, abuse response, and monitoring.
2. **Render is the easiest evaluation deployment** because this repository includes a Blueprint. Its free 0.1 CPU/512 MB instance, 15-minute sleep, approximately one-minute cold start, ephemeral filesystem, and post-April-2026 Hobby bandwidth allowance of only 5 GB make it unsuitable for a busy public relay. A handful of large downloads can exhaust that allowance.
3. **Google Cloud Run is a good scale-to-zero technical fit only for controlled traffic.** It supports Docker and long requests up to 60 minutes, but a billing account is required, egress is chargeable, files are ephemeral, instances can disappear, and in-memory job state is not safe if more than one instance is allowed. Set maximum instances to one for this architecture or replace the stores with Redis/object storage.
4. **Koyeb, Railway, and Northflank are useful tests, not an endorsed high-traffic production plan.** Their free resources or credits are small relative to FFmpeg and video egress.
5. **Fly.io has no permanent free tier for new accounts.** Its trial is only an evaluation.
6. **Hugging Face Docker Spaces is not recommended.** Current documentation says compute Spaces require a paid plan; more importantly, a general-purpose media relay is not aligned with the model/demo purpose of Spaces without explicit policy confirmation.

No host guarantees that YouTube will work. YouTube can challenge shared datacenter IPs even when the application and TLS stack are correct. Treat a provider-IP bot challenge differently from an application defect.

## Comparison

| Provider | Permanent free allowance / card | Docker, compute, RAM | Storage and sleep | Request/streaming characteristics | Bandwidth and custom domain | Regions | Practical verdict |
|---|---|---|---|---|---|---|---|
| **Render** | Free web service exists; Hobby workspace is $0. Payment verification can vary. | Docker supported; Free web service: 0.1 CPU, 512 MB RAM. | Local filesystem is ephemeral; no free persistent disk. Sleeps after 15 min idle; wake is about 1 min. Free services can restart. | Render documents web responses up to 100 minutes. Ordinary streaming responses work, but restarts/cold starts break jobs. | New Hobby plan includes 5 GB/month outbound; $0.15/GB overage if billing is enabled, otherwise services are suspended. Two custom domains included. | Oregon, Ohio, Virginia, Frankfurt, Singapore in Blueprint reference. | **Easiest demo, poor public relay.** FFmpeg on 0.1 CPU is slow and 5 GB egress is tiny. |
| **Koyeb** | One Free Instance per organization. Starter requires a valid payment method; onboarding/verification should be checked. | Docker supported; 0.1 vCPU, 512 MB RAM, 2 GB SSD. | No volume on Free. Free scales to zero after 1 hour idle. | Web service supports HTTP apps; verify any current request timeout before launch. 0.1 vCPU is a severe merge bottleneck. | Docs state 100 GB outbound is currently free and future overage is planned at $0.04/GB. Custom-domain availability depends on plan. | Free in Frankfurt or Washington, D.C. | **Useful low-traffic test.** Better nominal disk than Render, still underpowered and subject to provider-IP challenges. |
| **Google Cloud Run** | Recurring free compute/request allowance, but an active Cloud Billing account is required and normally needs payment verification. | Any compliant container; configurable CPU/RAM. Free request-based allowance: 180k vCPU-sec, 360k GiB-sec, 2M requests/month in eligible Tier 1 pricing. | Writable filesystem is ephemeral and instance-scoped; scale-to-zero. Ephemeral Disk is separately priced under newer pricing. | Configurable 1–3600 second request timeout. Response streaming/WebSockets supported. Container may continue after a client 504 unless code cancels work. | Internet egress is billed separately; free compute does not mean free video bandwidth. Custom-domain mapping is available but has product/region caveats. | Many regions; free-tier value based on eligible Tier 1 pricing. | **Good controlled deployment.** Set max instances 1 or externalize jobs; cap egress and file size. Billing/card required. |
| **Oracle Cloud Always Free VM** | Always Free resources are documented for the life of an account; payment card/identity verification is generally required. Availability is not guaranteed. | Docker on a VM. A1 allowance documented as up to 2 OCPUs/12 GB in the Always Free page (other OCI pages describe a larger universal free A1 allowance; use the Console’s “Always Free-eligible” label as authority). AMD micro shapes also exist. | Up to 200 GB Always Free block volume total. No automatic sleep, but idle instances can be reclaimed after sustained low CPU/network/memory. | Normal VM networking: operator controls proxy and timeouts; long streams are practical within resource/network limits. | Official Always Free page documents 10 TB/month outbound. Custom domain/TLS are operator-managed. | Home region only; A1 capacity shortages are common. | **Best free-resource fit** if capacity is available and the operator can secure a Linux VM. ARM64 image support is covered by this Dockerfile. |
| **Railway** | Free plan currently provides $1 recurring monthly credit; new trial gives $5 one-time credit without a card. Hobby is $5/month. | Docker supported; Free max shown as 1 vCPU, 0.5 GB RAM, one replica. | 1 GB ephemeral storage; free volume max 0.5 GB. Free deployment can be deprioritized during peak demand. | Web streaming is possible; verify current edge timeout. Small storage cannot safely hold many merged files. | Egress $0.05/GB. Free credit is consumed by compute, memory, and network. Custom domains supported by platform plans. | US, Europe, and Southeast Asia options are documented for common plans. | **Very short evaluation only.** $1 disappears quickly with an always-on process or video egress. |
| **Fly.io** | **No permanent free tier.** Trial: 2 VM hours or 7 days, whichever comes first; payment method required after trial. | Docker-native Machines; trial allows up to 2 vCPU/4 GB per machine but auto-stops trial machines after 5 min. | Root filesystem is ephemeral; paid volumes available. Machines can stop/start. | Long-lived services and streams work on paid Machines. | Public egress is billed by region; shared IPv4/IPv6 ingress available. Custom domains supported. | Broad global region selection. | **Paid option, not free hosting.** Trial is enough to validate the image, not run the service. |
| **Northflank** | Developer Sandbox is free and explicitly described as non-production. Card/onboarding requirements should be confirmed at signup. | Docker/services supported; free plan allows two services, two jobs, and one add-on. Exact current sandbox resource cap should be confirmed in dashboard. | Ephemeral storage available; paid volumes. Sandbox lifecycle and current sleep limits must be verified. | Container services can stream; no forced request limit was found in the cited overview. Do not infer an unlimited SLA. | Managed-cloud egress is priced; 2026 material shows $0.06/GB outside any sandbox allowance. Custom domains supported. | Managed regions include US, EU, and Asia; BYOC broader. | **Platform evaluation only.** Official docs say not to use Developer Sandbox for production. |
| **Hugging Face Docker Spaces** | Current Spaces overview says creating a compute Space requires a paid plan; Static Spaces remain free. Older “CPU Basic free” references can therefore be stale. | Docker SDK exists. Documented default environment is 2 CPU, 16 GB RAM, 50 GB non-persistent disk when eligible. | Non-persistent disk; free/basic hardware historically slept after inactivity. | Intended for ML demos/apps, not an unrestricted download relay. Proxy/stream behavior and limits are platform-specific. | Bandwidth limits are not presented as a media-relay allowance. Custom domains require eligible plan/features. | Platform-managed. | **Not recommended.** Obtain explicit policy approval before considering this workload. |

## Provider policy and `yt-dlp` considerations

Installing FFmpeg or `yt-dlp` in a container is not itself a guarantee that a workload is acceptable. The **operator’s use** controls compliance:

- Render’s AUP prohibits IP infringement, bypassing access restrictions, and disproportionate infrastructure load. Its DMCA policy covers repeat infringement.
- Google, Oracle, Koyeb, Railway, Fly.io, Northflank, and Hugging Face similarly bind accounts to their then-current terms/AUP. Review the current policy with the intended traffic pattern before launch.
- This application blocks private addresses, disables playlists/live streams, rate-limits requests, caps concurrent jobs, uses one-time tickets, limits duration/filesize, and states authorized-use rules. These are controls, not immunity from complaints or provider enforcement.
- A public anonymous relay still carries substantial abuse risk. A production operator should add an application API key or user authentication, quotas backed by a shared store, a takedown process, metrics, and a hard monthly egress budget.
- Cookies must be authorized for the operator’s own account and use case. They do not make private or paid media acceptable to relay.

## YouTube and datacenter IPs

Current `yt-dlp` needs FFmpeg for merging and strongly recommends `yt-dlp-ejs` plus a supported JavaScript runtime for full YouTube extraction. This image installs `yt-dlp[default]` and Node.js 24, then explicitly passes `--js-runtimes node`.

Even with the correct runtime, YouTube can require bot verification, cookies, proof-of-origin tokens, or a different network. Shared cloud addresses are challenged more often than residential sessions. **Do not disable TLS verification.** A provider that successfully runs the container may still fail to extract YouTube. The UI maps that to a specific `BOT_VERIFICATION` or `NETWORK_ERROR` instead of claiming the application succeeded.

## Recommended deployment profiles

### Evaluation on Render

- Use the included `render.yaml`.
- Keep `DOWNLOAD_MAX_CONCURRENT=1` if FFmpeg memory/CPU pressure appears.
- Lower `DOWNLOAD_MAX_FILE_MB` to 100 or less to preserve temporary space and egress.
- Expect a cold-start delay and the loss of all in-memory jobs on sleep/redeploy.
- Do not advertise it as a high-volume public service.

### Durable low-cost operator deployment

- Use an Oracle A1 VM or a small paid VPS with at least 2 GB RAM and enough temporary disk for the configured maximum file size times concurrency.
- Put Caddy or nginx in front with HTTPS, request-size limits, access-log redaction, and sensible stream timeouts.
- Add authenticated access or per-user quotas.
- Monitor filesystem free space, FFmpeg CPU, child-process count, error-code rates, and egress.
- Update the container at least monthly and promptly after `yt-dlp` extraction breakages or security releases.

## Official sources

### Render

- [Free services, sleep, ephemeral files, and usage behavior](https://render.com/docs/free)
- [Instance types (Free: 0.1 CPU / 512 MB)](https://render.com/docs/compute-plans)
- [Outbound bandwidth](https://render.com/docs/outbound-bandwidth)
- [April 2026 workspace plan changes](https://render.com/docs/new-workspace-plans)
- [Blueprint specification](https://render.com/docs/blueprint-spec)
- [Acceptable Use Policy](https://render.com/acceptable-use)
- [DMCA policy](https://render.com/dmca-policy)

### Koyeb

- [Free instance overview](https://www.koyeb.com/docs/reference/instances)
- [Scale to zero](https://www.koyeb.com/docs/run-and-scale/scale-to-zero)
- [Organizations and payment-plan rules](https://www.koyeb.com/docs/reference/organizations)
- [Pricing FAQ and outbound allowance](https://www.koyeb.com/docs/faqs/pricing)

### Google Cloud Run

- [Cloud Run pricing and free allowance](https://cloud.google.com/run/pricing)
- [Google Cloud Free Tier billing-account requirement](https://cloud.google.com/free/docs/free-cloud-features/)
- [Request timeout up to 60 minutes](https://cloud.google.com/run/docs/configuring/request-timeout)
- [Container runtime contract](https://cloud.google.com/run/docs/container-contract)

### Oracle Cloud

- [Always Free resources, compute, storage, reclamation, and outbound data](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- [Creating an instance and Always Free shapes](https://docs.oracle.com/en-us/iaas/Content/Compute/Tasks/launchinginstance.htm)
- [Arm-based compute](https://docs.oracle.com/en-us/iaas/Content/Compute/References/arm.htm)

### Railway

- [Plans and Free/Hobby resources](https://docs.railway.com/pricing/plans)
- [Pricing and egress](https://docs.railway.com/pricing)
- [Deployment and ephemeral storage limits](https://docs.railway.com/deployments/reference)
- [Volume limits](https://docs.railway.com/volumes/reference)

### Fly.io

- [No permanent free tier](https://fly.io/docs/about/cost-management/)
- [Free trial limits](https://fly.io/docs/about/free-trial/)
- [Machine and network pricing](https://fly.io/docs/about/pricing/)

### Northflank

- [Developer Sandbox scope](https://northflank.com/docs/v1/application/billing/pricing-on-northflank)
- [Project and plan selection](https://northflank.com/docs/v1/application/getting-started/create-a-project)

### Hugging Face

- [Spaces overview and current plan requirement](https://huggingface.co/docs/hub/en/spaces-overview)
- [Docker Spaces](https://huggingface.co/docs/hub/en/spaces-sdks-docker)
- [Spaces hardware and sleep](https://huggingface.co/docs/hub/en/spaces-gpus)
- [Terms of Service](https://huggingface.co/terms-of-service)
