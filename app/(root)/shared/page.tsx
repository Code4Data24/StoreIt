import React from "react";
import Card from "@/components/Card";
import { getFilesSharedWithMe } from "@/lib/actions";
import { getCurrentUser } from "@/lib/actions/user.actions";

const SharedWithMePage = async () => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const sharedFiles = await getFilesSharedWithMe();

  return (
    <div className="page-container">
      <section className="w-full">
        <h1 className="h1">Shared with me</h1>
        <p className="body-1 text-light-200 mt-2">
          Files shared with your email address
        </p>
      </section>

      {sharedFiles.length > 0 ? (
        <section className="file-list">
          {sharedFiles.map((file: any) => (
            <Card key={file.id} file={file} currentUserId={currentUser.id} />
          ))}
        </section>
      ) : (
        <p className="empty-list">No files have been shared with you yet</p>
      )}
    </div>
  );
};

export default SharedWithMePage;
