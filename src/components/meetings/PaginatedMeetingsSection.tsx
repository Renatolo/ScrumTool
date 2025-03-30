
import React, { useState } from "react";
import { Meeting } from "@/types/project";
import MeetingCard from "./MeetingCard";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

interface PaginatedMeetingsSectionProps {
  title: string;
  meetings: Meeting[];
  onEdit: (meeting: Meeting) => void;
  onDelete: (meetingId: string) => void;
  className?: string;
  itemsPerPage?: number;
}

const PaginatedMeetingsSection = ({ 
  title, 
  meetings, 
  onEdit, 
  onDelete,
  className = "",
  itemsPerPage = 3
}: PaginatedMeetingsSectionProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Calculate pagination values
  const totalPages = Math.ceil(meetings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMeetings = meetings.slice(startIndex, startIndex + itemsPerPage);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 3; // Show max 3 page numbers
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink 
            onClick={() => handlePageChange(i)} 
            isActive={i === currentPage}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return items;
  };

  return (
    <div className={`border rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-medium mb-4 text-red-800">{title}</h3>
      {meetings.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedMeetings.map((meeting) => (
              <MeetingCard 
                key={meeting.id}
                meeting={meeting}
                onEdit={onEdit}
                onDelete={onDelete}
                isPast={true}
              />
            ))}
          </div>
          
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  {currentPage > 1 && (
                    <PaginationItem>
                      <PaginationPrevious onClick={() => handlePageChange(currentPage - 1)} />
                    </PaginationItem>
                  )}
                  
                  {renderPaginationItems()}
                  
                  {currentPage < totalPages && (
                    <PaginationItem>
                      <PaginationNext onClick={() => handlePageChange(currentPage + 1)} />
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-5 bg-muted/20 rounded-lg">
          <p className="text-muted-foreground">No past meetings</p>
        </div>
      )}
    </div>
  );
};

export default PaginatedMeetingsSection;
