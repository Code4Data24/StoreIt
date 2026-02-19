import Image from "next/image";
import Link from "next/link";
import { getPublicSignedUrlByToken } from "@/lib/actions/file.actions";
import { notFound } from "next/navigation";
import Thumbnail from "@/components/Thumbnail";
import FormattedDateTime from "@/components/FormattedDateTime";
import { Button } from "@/components/ui/button";
import { convertFileSize } from "@/lib/utils";

const PublicSharePage = async ({ params }: { params: { token: string } }) => {
  const token = (await params).token;

  let fileData: any = null;
  let previewUrl: string | null = null;
  let downloadUrl: string | null = null;

  try {
    // Get preview URL with file metadata
    const previewResult = await getPublicSignedUrlByToken({ token, kind: "preview" });
    if (previewResult.signedUrl && previewResult.file) {
      previewUrl = previewResult.signedUrl;
      fileData = previewResult.file;
    }

    // Get download URL
    const downloadResult = await getPublicSignedUrlByToken({ token, kind: "download" });
    if (downloadResult.signedUrl) {
      downloadUrl = downloadResult.signedUrl;
    }
  } catch (error) {
    console.error("Public link error:", error);
    notFound();
  }

  if (!fileData) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-dark-200 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-dark-300 rounded-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="h2 text-light-100">Shared File</h1>
          <p className="body-1 text-light-200">
            This file has been shared with you via a public link
          </p>
        </div>

        <div className="bg-dark-400 rounded-lg p-6 space-y-4">
          {previewUrl && (
            <div className="flex justify-center">
              <Thumbnail
                type={fileData.type}
                extension={fileData.extension}
                url={previewUrl}
                className="!size-32"
                imageClassName="!size-24"
              />
            </div>
          )}

          <div className="text-center space-y-2">
            <h2 className="h3 text-light-100">{fileData.name}</h2>
            <p className="body-2 text-light-200">
              {convertFileSize(fileData.size)} • {fileData.type}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {previewUrl && (
              <Link href={previewUrl} target="_blank" rel="noopener noreferrer">
                <Button className="w-full sm:w-auto">
                  Preview
                </Button>
              </Link>
            )}
            {downloadUrl && (
              <Link href={downloadUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full sm:w-auto">
                  Download
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="text-center">
          <p className="caption text-light-300">
            This link provides anonymous access to the shared file
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicSharePage;
