"use client";

import React, { useRef, useState, useEffect } from "react";
import * as tus from "tus-js-client";
import Image from "next/image";
import { getFileType } from "@/lib/utils";
import { createFileRecord } from "@/lib/actions/file.actions";

interface Props {
  file: File;
  userId: string;
  accessToken: string;
  progress: number;
  error: string | null;
  onFailed: (error: string) => void;
}

const TusUploadCard = ({ file, progress, error, onFailed }: Props) => {
  const fileType = getFileType(file.name).type;

  return (
    <div className={`flex flex-col gap-2 p-4 border rounded-lg bg-white shadow-sm w-full max-w-md ${error ? 'border-red-500' : ''}`}>
      <div className="flex items-center gap-3">
        <Image
          src={`/assets/icons/file-${fileType}.svg`}
          alt="file icon"
          width={40}
          height={40}
        />
        <div className="flex-1 overflow-hidden">
          <p className="subtitle-2 line-clamp-1">{file.name}</p>
          {error ? (
            <p className="caption text-red-500 line-clamp-1">{error}</p>
          ) : (
            <p className="caption text-light-200">Uploading... {progress}%</p>
          )}
        </div>
      </div>
      <div className="w-full bg-light-400 h-2 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${error ? 'bg-red-500' : 'bg-brand'}`} 
          style={{ width: `${progress}%` }}
        />
      </div>
      {error && (
        <button 
          onClick={() => onFailed("removed")} 
          className="text-xs text-light-200 hover:text-brand self-end"
        >
          Dismiss
        </button>
      )}
    </div>
  );
};

export default TusUploadCard;
