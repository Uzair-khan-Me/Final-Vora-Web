export type MediaFormat = {
  id: string;
  kind: "video" | "audio";
  label: string;
  quality: string;
  extension: string;
  estimatedBytes: number | null;
  requiresMerge: boolean;
  fps: number | null;
};

export type MediaDetails = {
  id: string;
  title: string;
  creator: string | null;
  duration: number | null;
  thumbnail: string | null;
  source: string;
  formats: MediaFormat[];
};

export type InfoResponse = {
  jobId: string;
  expiresAt: string;
  media: MediaDetails;
};

export type DownloadStartResponse = {
  jobId: string;
  status: "ready" | "preparing";
  progress: number;
  downloadUrl?: string;
  statusUrl?: string;
};

export type JobStatusResponse = {
  jobId: string;
  status: "preparing" | "ready" | "failed";
  progress: number;
  message: string;
  downloadUrl?: string;
  error?: { code: string; message: string };
};
