"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { useTransition } from "react";
import FormattedDateTime from "@/components/FormattedDateTime";
import Thumbnail from "@/components/Thumbnail";
import { convertFileSize } from "@/lib/utils";

type FileRecord = {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  created_at: string;
  owner_id?: string;
  is_public?: boolean;
  share_token?: string;
};

interface Props {
  file: FileRecord;
  shareEmails: string[];
  setShareEmails: (emails: string[]) => void;
  sharedUsers: { shared_with_email: string; created_at: string }[];
  isPublicLinkEnabled: boolean;
  setIsPublicLinkEnabled: (enabled: boolean) => void;
  onShare: () => void;
  onRemoveAccess: (email: string) => void;
  onTogglePublicLink: () => void;
  onRotatePublicLink: () => void;
}

export default function ShareDialogContent({
  file,
  shareEmails,
  setShareEmails,
  sharedUsers,
  isPublicLinkEnabled,
  setIsPublicLinkEnabled,
  onShare,
  onRemoveAccess,
  onTogglePublicLink,
  onRotatePublicLink,
}: Props) {
  const [isTogglingPublicLink, startToggleTransition] = useTransition();
  const publicLinkUrl = file.share_token
    ? `${window.location.origin}/share/${file.share_token}`
    : "";

  return (
    <div className="space-y-6">
      {/* File preview */}
      <div className="file-details-thumbnail">
        <Thumbnail
          type={file.type}
          extension={file.name.split(".").pop() || ""}
          url={null}
        />
        <div className="flex flex-col">
          <p className="subtitle-2 mb-1">{file.name}</p>
          <FormattedDateTime date={file.created_at} className="caption" />
        </div>
      </div>

      <Separator />

      {/* Email sharing */}
      <div className="space-y-3">
        <Label className="text-light-100">Share via email</Label>
        <Input
          type="email"
          placeholder="Enter email address"
          value={shareEmails.join(", ")}
          onChange={(e) =>
            setShareEmails(
              e.target.value.trim().split(",").filter(Boolean)
            )
          }
          className="share-input-field"
        />
        <Button onClick={onShare} className="modal-submit-button w-full">
          Add to share list
        </Button>
      </div>

      <Separator />

      {/* Shared users list */}
      {sharedUsers.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label className="text-light-100">Shared with</Label>
            <span className="subtitle-2 text-light-200">
              {sharedUsers.length} users
            </span>
          </div>
          <ul className="space-y-2">
            {sharedUsers.map((user) => (
              <li
                key={user.shared_with_email}
                className="flex items-center justify-between gap-2"
              >
                <span className="subtitle-2">
                  {user.shared_with_email}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    onRemoveAccess(user.shared_with_email)
                  }
                  className="share-remove-user"
                >
                  <Image
                    src="/assets/icons/remove.svg"
                    alt="Remove"
                    width={20}
                    height={20}
                  />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Separator />

      {/* Public link */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-light-100">Public link</Label>
          <div className="flex items-center gap-3">
            {isTogglingPublicLink && (
              <Image
                src="/assets/icons/loader.svg"
                alt="loader"
                width={18}
                height={18}
                className="animate-spin"
              />
            )}
            <input
              type="checkbox"
              checked={isPublicLinkEnabled}
              disabled={isTogglingPublicLink}
              onChange={() => {
                startToggleTransition(async () => {
                  await onTogglePublicLink();
                });
              }}
              className="w-4 h-4"
            />
          </div>
        </div>

        {isPublicLinkEnabled && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={publicLinkUrl}
                readOnly
                placeholder="Generating link..."
                className="flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(publicLinkUrl);
                }}
              >
                Copy
              </Button>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={onRotatePublicLink}
              className="w-full"
            >
              Rotate link
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
