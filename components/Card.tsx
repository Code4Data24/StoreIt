"use client";
import Thumbnail from "@/components/Thumbnail";
import { convertFileSize } from "@/lib/utils";
import FormattedDateTime from "@/components/FormattedDateTime";
import ActionDropdown from "@/components/ActionDropdown";
import { getFilePreviewUrl } from "@/lib/actions/file.actions";


const Card = ({ file, currentUserId }: { file: any; currentUserId: string }) => {
  const handlePreview = async () => {
    try {
      const result = await getFilePreviewUrl({ path: file.path });
      if (result.success && result.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Failed to get preview URL:", error);
    }
  };
  return (
    <div className="file-card cursor-pointer group" onClick={handlePreview}>
      <div className="flex justify-between">
        <Thumbnail
          type={file.type}
          extension={file.extension}
          url={file.url}
          className="!size-20"
          imageClassName="!size-11"
        />

        <div
          className="flex flex-col items-end justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          <ActionDropdown file={file} currentUserId={currentUserId} />
          <p className="body-1">{convertFileSize(file.size)}</p>
        </div>
      </div>

      <div className="file-card-details">
        <p className="subtitle-2 line-clamp-1 group-hover:text-brand transition-colors">
          {file.name}
        </p>
        <FormattedDateTime
          date={file.created_at}
          className="body-2 text-light-100"
        />
      </div>
    </div>
  );
};
export default Card;
