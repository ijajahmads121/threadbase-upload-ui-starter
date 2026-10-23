import { useEffect, useRef, useState } from "react";
import apiClient from "../services/apiClient.js";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function validate(file) {
  if (!ALLOWED.includes(file.type)) {
    return "Only image files are allowed (JPEG, PNG, WebP, GIF).";
  }
  if (file.size > MAX_SIZE) {
    return "File is too large (max 5MB).";
  }
  return null;
}

export default function AvatarUploader() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!preview) return undefined;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function handleFile(candidate) {
    setError(null);
    setUploadedUrl(null);
    setProgress(0);
    setFile(null);
    setPreview(null);

    if (!candidate) return;

    const validationError = validate(candidate);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFile(candidate);
    setPreview(URL.createObjectURL(candidate));
  }

  function handleDragOver(event) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files[0]);
  }

  async function upload() {
    if (!file || isUploading) return;

    const formData = new FormData();
    formData.append("avatar", file);
    setError(null);
    setUploadedUrl(null);
    setProgress(0);
    setIsUploading(true);

    try {
      const response = await apiClient.post("/api/upload", formData, {
        onUploadProgress: (event) => {
          if (event.total) {
            setProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      });
      setProgress(100);
      setUploadedUrl(response.data.url);
    } catch (uploadError) {
      setError(
        uploadError.response?.data?.error ||
          uploadError.message ||
          "Upload failed. Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <div
        className={isDragging ? "drop-zone dragging" : "drop-zone"}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="Choose an avatar image or drop one here"
      >
        <p>{isDragging ? "Drop to upload" : "Drag an image here, or click to choose"}</p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(",")}
          hidden
          onChange={(event) => {
            handleFile(event.target.files[0]);
            event.target.value = "";
          }}
        />
      </div>

      {file && (
        <p>
          Selected: <strong>{file.name}</strong>
        </p>
      )}
      {preview && <img src={preview} alt="Avatar preview" className="preview" />}
      {error && <p className="error" role="alert">{error}</p>}

      {(isUploading || progress > 0) && (
        <div aria-live="polite">
          <p>{isUploading ? `Uploading ${file?.name}` : "Upload complete"}</p>
          <div
            className="bar"
            role="progressbar"
            aria-label="Upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="fill" style={{ width: `${progress}%` }} />
          </div>
          <p>{progress}%</p>
        </div>
      )}
      {uploadedUrl && <p role="status">Uploaded: {uploadedUrl}</p>}

      <button onClick={upload} disabled={!file || isUploading}>
        {isUploading ? "Uploading…" : "Upload"}
      </button>
    </div>
  );
}
