import React, { useState } from 'react';
import { Comment } from '../../types';

import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { Separator } from '~/components/ui/separator';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { cn } from '~/lib/utils';


// NOTE: This is a refactored version of the CommentsPanel component.
// The original logic has been temporarily removed to facilitate the UI migration.
// It will be re-implemented in subsequent steps.

interface CommentsPanelProps {
  entityId: string;
  entityType: 'document' | 'task' | 'structure' | 'rfi' | 'boq-item' | 'inspection' | 'photo';
  comments: Comment[];
  onAddComment: (comment: Omit<Comment, 'id' | 'timestamp'>) => void;
  currentUser: { id: string; name: string };
}

const CommentsPanel: React.FC<CommentsPanelProps> = ({
  entityId,
  entityType,
  comments,
  onAddComment,
  currentUser
}) => {
  const [newComment, setNewComment] = useState('');

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment({
        entityId,
        entityType,
        authorId: currentUser.id,
        authorName: currentUser.name,
        content: newComment.trim()
      });
      setNewComment('');
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-solid border-border">
      <h3 className="text-xl font-bold mb-4">Comments</h3>
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-baseline space-x-2">
                <p className="font-semibold text-sm">{comment.authorName}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(comment.timestamp).toLocaleString()}
                </p>
              </div>
              <p className="text-sm text-foreground mt-1">{comment.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-muted-foreground text-sm">No comments yet. Be the first to add one!</p>
        )}
      </div>
      <Separator className="my-6" />
      <div className="flex flex-col gap-3">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          className="resize-none"
        />
        <Button onClick={handleAddComment} className="self-end">
          Add Comment
        </Button>
      </div>
    </div>
  );
};

export default CommentsPanel;
