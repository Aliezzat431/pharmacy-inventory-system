"use client";

import React from "react";
import { AIForm } from "./AIForm";
import { AIChart } from "./AIChart";
import { AITable } from "./AITable";
import { AICard } from "./AICard";
import { AIActionButtons } from "./AIActionButtons";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const AIMessage = ({ message, onFormSubmit, onAction }) => {
  const { role, content, ui } = message;

  // مفيش UI مخصص - اعرض Markdown عادي
  if (!ui) {
    return (
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  // عرض UI حسب النوع
  const renderUI = () => {
    switch (ui.type) {
      case "form":
        return <AIForm config={ui.config} onSubmit={(data) => onFormSubmit(data, ui)} />;
      
      case "chart":
        return <AIChart config={ui.config} />;
      
      case "table":
        return <AITable config={ui.config} />;
      
      case "card":
        return <AICard config={ui.config} />;
      
      case "actions":
        return <AIActionButtons config={ui.config} onAction={onAction} />;
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {content && (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      )}
      {renderUI()}
    </div>
  );
};