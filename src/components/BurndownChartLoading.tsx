
import { Card, CardContent } from "@/components/ui/card";

const BurndownChartLoading = () => {
  return (
    <Card className="w-full mb-6">
      <CardContent className="p-4">
        <div className="h-[250px] flex items-center justify-center">
          <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BurndownChartLoading;
