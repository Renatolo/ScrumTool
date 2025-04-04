
import React, { useState } from "react";
import { Meeting } from "@/types/project";
import MeetingCard from "../meetings/MeetingCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginatedMeetingsSectionProps {
  title: string;
  meetings: Meeting[];
  onEdit: (meeting: Meeting) => void;
  onDelete: (meetingId: string) => void;
  onView?: (meeting: Meeting) => void;
  className?: string;
  itemsPerPage?: number;
  showViewButton?: boolean;
}

const PaginatedMeetingsSection = ({
  title,
  meetings,
  onEdit,
  onDelete,
  onView,
  className = "",
  itemsPerPage = 3,
  showViewButton = false
}: PaginatedMeetingsSectionProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  if (meetings.length === 0) {
    return null;
  }
  
  const totalPages = Math.ceil(meetings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visibleMeetings = meetings.slice(startIndex, startIndex + itemsPerPage);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className={`rounded-md ${className}`}>
      <h3 className="text-lg font-medium mb-4">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleMeetings.map((meeting) => (
          <MeetingCard
            key={meeting.id}
            meeting={meeting}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
            isPast={true}
            showViewButton={showViewButton}
          />
        ))}
      </div>
      
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-nav"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </Button>
          
          {Array.from({ length: totalPages }).map((_, index) => (
            <Button
              key={index}
              variant={currentPage === index + 1 ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageChange(index + 1)}
              className={`pagination-item ${currentPage === index + 1 ? 'active' : ''}`}
            >
              {index + 1}
            </Button>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-nav"
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next page</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default PaginatedMeetingsSection;
