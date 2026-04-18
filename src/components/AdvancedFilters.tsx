import { useState } from "react";
import { Filter, X, Shuffle, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FilterState {
  genre: string;
  year: string;
  status: string;
  sortBy: string;
}

interface AdvancedFiltersProps {
  genres: string[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onRandomAnime: () => void;
  className?: string;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => (currentYear - i).toString());

const statusOptions = [
  { value: "all", label: "Összes" },
  { value: "ongoing", label: "Folyamatban" },
  { value: "completed", label: "Befejezett" },
  { value: "upcoming", label: "Beharangozott" },
];

const sortOptions = [
  { value: "newest", label: "Legújabb" },
  { value: "oldest", label: "Legrégebbi" },
  { value: "title_asc", label: "Cím (A-Z)" },
  { value: "title_desc", label: "Cím (Z-A)" },
  { value: "rating", label: "Legjobb értékelés" },
];

const AdvancedFilters = ({ 
  genres, 
  filters, 
  onFilterChange, 
  onRandomAnime,
  className 
}: AdvancedFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFiltersCount = Object.entries(filters).filter(
    ([key, value]) => value && value !== "all" && value !== "newest"
  ).length;

  const updateFilter = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      genre: "",
      year: "",
      status: "all",
      sortBy: "newest",
    });
  };

  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toggle button and quick actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Szűrők
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
              {activeFiltersCount}
            </Badge>
          )}
          <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
        </Button>

        <Button
          variant="outline"
          onClick={onRandomAnime}
          className="gap-2"
        >
          <Shuffle className="w-4 h-4" />
          Random anime
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
            Szűrők törlése
          </Button>
        )}
      </div>

      {/* Active filters badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.genre && (
            <Badge variant="secondary" className="gap-1">
              {filters.genre}
              <button onClick={() => updateFilter("genre", "")}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.year && (
            <Badge variant="secondary" className="gap-1">
              {filters.year}
              <button onClick={() => updateFilter("year", "")}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.status && filters.status !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {statusOptions.find(o => o.value === filters.status)?.label}
              <button onClick={() => updateFilter("status", "all")}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Expanded filters panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-card border border-border rounded-lg">
              {/* Genre filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Műfaj</label>
                <Select
                  value={filters.genre || "all"}
                  onValueChange={(value) => updateFilter("genre", value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Összes műfaj" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Összes műfaj</SelectItem>
                    {genres.map((genre) => (
                      <SelectItem key={genre} value={genre}>
                        {genre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Év</label>
                <Select
                  value={filters.year || "all"}
                  onValueChange={(value) => updateFilter("year", value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Összes év" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Összes év</SelectItem>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Státusz</label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) => updateFilter("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Összes státusz" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Rendezés</label>
                <Select
                  value={filters.sortBy || "newest"}
                  onValueChange={(value) => updateFilter("sortBy", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rendezés" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedFilters;
