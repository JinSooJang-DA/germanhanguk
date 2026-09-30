"use client";

import { useEffect, useState } from "react";

interface PostViewCountProps {
  postId: number;
  initialViews: number;
}

export const VIEW_INCREMENT_EVENT = "post-view-incremented";

export default function PostViewCount({ postId, initialViews }: PostViewCountProps) {
  const [views, setViews] = useState(initialViews);

  useEffect(() => {
    const handleViewIncrement = (event: Event) => {
      const detail = (event as CustomEvent<{ postId: number }>).detail;
      if (detail?.postId === postId) {
        setViews((currentViews) => currentViews + 1);
      }
    };

    window.addEventListener(VIEW_INCREMENT_EVENT, handleViewIncrement);
    return () => window.removeEventListener(VIEW_INCREMENT_EVENT, handleViewIncrement);
  }, [postId]);

  return <>👁️ 조회 {views}회</>;
}
