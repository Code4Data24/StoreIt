"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import TusUploadCard from "./TusUploadCard";
import supabase from "@/lib/supabase/client";
import * as tus from "tus-js-client";
import { getFileType } from "@/lib/utils";
import { createFileRecord } from "@/lib/actions/file.actions";

interface Props {
  userId: string;
}

interface UploadState {
  id: string;
  file: File;
  progress: number;
  error: string | null;
  status: 'uploading' | 'completed' | 'error';
}

const FileUploader = ({ userId }: Props) => {
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadsRef = useRef<Record<string, tus.Upload>>({});

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setAccessToken(session.access_token);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAccessToken(session?.access_token || null);
      }
    );

    return () => {
      subscription.unsubscribe();
      // Cleanup all active uploads on unmount
      Object.values(activeUploadsRef.current).forEach(upload => upload.abort());
    };
  }, []);

  const startUpload = useCallback(async (file: File, id: string, token: string) => {
    const objectName = `${userId}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

    const upload = new tus.Upload(file, {
      endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        Authorization: `Bearer ${token}`,
        "x-upsert": "true",
      },
      metadata: {
        bucketName: "files",
        objectName: objectName,
        contentType: file.type,
      },
      chunkSize: 5 * 1024 * 1024,
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
        setUploads(prev => {
          if (!prev[id] || percentage <= prev[id].progress) return prev;
          return {
            ...prev,
            [id]: { ...prev[id], progress: percentage }
          };
        });
      },
      onSuccess: async () => {
        try {
          const fileTypeData = getFileType(file.name);
          const res = await createFileRecord({
            name: file.name,
            size: file.size,
            type: fileTypeData.type,
            extension: fileTypeData.extension,
            path: objectName,
            userId,
          });

          if (res.success) {
            setUploads(prev => {
              const newUploads = { ...prev };
              delete newUploads[id];
              return newUploads;
            });
          } else {
            setUploads(prev => ({
              ...prev,
              [id]: { ...prev[id], status: 'error', error: res.error || "Failed to save record" }
            }));
          }
        } catch (err: any) {
          setUploads(prev => ({
            ...prev,
            [id]: { ...prev[id], status: 'error', error: err.message }
          }));
        }
        delete activeUploadsRef.current[id];
      },
      onError: (err) => {
        console.error("TUS Error:", err);
        setUploads(prev => ({
          ...prev,
          [id]: { ...prev[id], status: 'error', error: err.message.includes("403") ? "Permission denied" : err.message }
        }));
        delete activeUploadsRef.current[id];
      },
    });

    activeUploadsRef.current[id] = upload;
    upload.start();
  }, [userId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && accessToken) {
      const selectedFiles = Array.from(e.target.files);
      selectedFiles.forEach(file => {
        const id = crypto.randomUUID();
        setUploads(prev => ({
          ...prev,
          [id]: { id, file, progress: 0, error: null, status: 'uploading' }
        }));
        startUpload(file, id, accessToken);
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = (id: string) => {
    if (activeUploadsRef.current[id]) {
      activeUploadsRef.current[id].abort();
      delete activeUploadsRef.current[id];
    }
    setUploads(prev => {
      const newUploads = { ...prev };
      delete newUploads[id];
      return newUploads;
    });
  };

  const uploadList = Object.values(uploads);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="file"
        multiple
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      <Button
        type="button"
        className="uploader-button"
        onClick={handleUploadClick}
      >
        <Image
          src="/assets/icons/upload.svg"
          alt="upload"
          width={24}
          height={24}
        />{" "}
        <p>Upload</p>
      </Button>

      {uploadList.length > 0 && (
        <div className="fixed bottom-10 right-10 z-50 flex flex-col gap-3 max-h-[70vh] overflow-y-auto p-4 bg-transparent">
          {uploadList.map((upload) => (
            <TusUploadCard
              key={upload.id}
              file={upload.file}
              userId={userId}
              accessToken={accessToken || ""}
              progress={upload.progress}
              error={upload.error}
              onFailed={(err) => {
                if (err === "removed") handleRemove(upload.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
