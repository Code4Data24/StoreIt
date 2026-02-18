"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileDetails } from "@/components/ActionsModalContent";
import { SupabaseFile } from "@/types";
import ShareDialogContent from "@/components/ShareDialogContent";
import { useState, useEffect } from "react";
import Image from "next/image";

import { actionsDropdownItems } from "@/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  deleteFile,
  getFileDownloadUrlSecure,
  renameFile,
  shareFileWithEmail,
  removeFileAccess,
  getFileSharedUsers,
  enablePublicLink,
  disablePublicLink,
  rotatePublicLinkToken,
} from "@/lib/actions/file.actions";
import { usePathname } from "next/navigation";

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

const ActionDropdown = ({ file, currentUserId }: { file: FileRecord; currentUserId: string }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [action, setAction] = useState<{ label: string; icon: string; value: string } | null>(null);
  const [name, setName] = useState(file.name);
  const [isLoading, setIsLoading] = useState(false);
  const [shareEmails, setShareEmails] = useState<string[]>([]);
  const [sharedUsers, setSharedUsers] = useState<{ shared_with_email: string; created_at: string }[]>([]);
  const [isPublicLinkEnabled, setIsPublicLinkEnabled] = useState(file.is_public || false);

  const handleDownload = async () => {
    try {
      const result = await getFileDownloadUrlSecure({ path: file.path });

      if (!result.success || !result.url) {
        throw new Error("Failed to get download URL");
      }

      const response = await fetch(result.url);
      if (!response.ok) {
        throw new Error("Failed to fetch file");
      }

      const blob = await response.blob();

      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.name;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  useEffect(() => {
    setName(file.name);
    setIsPublicLinkEnabled(file.is_public || false);
    if (action?.value === "share" && file.id) {
      getFileSharedUsers(file.id).then(setSharedUsers).catch(console.error);
    }
  }, [file.name, file.is_public, file.id, action?.value]);

  const path = usePathname();

  const closeAllModals = () => {
    setIsModalOpen(false);
    setIsDropdownOpen(false);
    setAction(null);
    setName(file.name);
  };

  const handleAction = async () => {
    if (!action) return;
    setIsLoading(true);
    let success = false;

    const actions = {
      rename: async () => {
        await renameFile({ fileId: file.id, name });
        return true;
      },
      delete: async () => {
        await deleteFile({ fileId: file.id, path: file.path });
        return true;
      },
      share: async () => {
        for (const email of shareEmails) {
          if (email) await shareFileWithEmail({ fileId: file.id, email });
        }
        setShareEmails([]);
        return true;
      },
    };

    success = await actions[action.value as keyof typeof actions]();

    if (success) closeAllModals();

    setIsLoading(false);
  };

  const renderDialogContent = () => {
    if (!action) return null;

    const { value, label } = action;

    return (
      <DialogContent className="shad-dialog button">
        <DialogHeader className="flex flex-col gap-3">
          <DialogTitle className="text-center text-light-100">
            {label}
          </DialogTitle>
          {value === "rename" && (
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          {value === "details" && (
            <FileDetails file={file as SupabaseFile} />
          )}

          {value === "share" && (
            <ShareDialogContent
              file={file}
              shareEmails={shareEmails}
              setShareEmails={setShareEmails}
              sharedUsers={sharedUsers}
              isPublicLinkEnabled={isPublicLinkEnabled}
              setIsPublicLinkEnabled={setIsPublicLinkEnabled}
              onShare={handleAction}
              onRemoveAccess={async (email: string) => {
                await removeFileAccess({ fileId: file.id, email });
                setSharedUsers((prev) => prev.filter((u) => u.shared_with_email !== email));
              }}
              onTogglePublicLink={async () => {
                if (isPublicLinkEnabled) {
                  await disablePublicLink({ fileId: file.id });
                } else {
                  await enablePublicLink({ fileId: file.id });
                }
                setIsPublicLinkEnabled(!isPublicLinkEnabled);
              }}
              onRotatePublicLink={async () => {
                await rotatePublicLinkToken({ fileId: file.id });
              }}
            />
          )}
        </DialogHeader>
        {["rename", "delete"].includes(value) && (
          <DialogFooter className="flex flex-col gap-3 md:flex-row">
            <Button onClick={closeAllModals} className="modal-cancel-button">
              Cancel
            </Button>
            <Button onClick={handleAction} className="modal-submit-button">
              <p className="capitalize">{value}</p>
              {isLoading && (
                <Image
                  src="/assets/icons/loader.svg"
                  alt="loader"
                  width={24}
                  height={24}
                  className="animate-spin"
                />
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    );
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger className="shad-no-focus">
          <Image
            src="/assets/icons/dots.svg"
            alt="dots"
            width={34}
            height={34}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel className="max-w-[200px] truncate">
            {file.name}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actionsDropdownItems
            .filter((item) => {
              if (item.value === "share") {
                return file.owner_id === currentUserId;
              }
              if (["rename", "delete"].includes(item.value)) {
                return file.owner_id === currentUserId;
              }
              return true;
            })
            .map((actionItem) => (
              <DropdownMenuItem
                key={actionItem.value}
                className="shad-dropdown-item"
                onClick={() => {
                  setAction(actionItem);

                  if (
                    ["rename", "delete", "details", "share"].includes(actionItem.value)
                  ) {
                    setIsModalOpen(true);
                  }

                  if (actionItem.value === "download") {
                    handleDownload();
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <Image
                    src={actionItem.icon}
                    alt={actionItem.label}
                    width={30}
                    height={30}
                  />
                  {actionItem.label}
                </div>
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {renderDialogContent()}
    </Dialog>
  );
};
export default ActionDropdown;
