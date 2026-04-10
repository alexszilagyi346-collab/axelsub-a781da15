import { useState, useEffect } from "react";
import { Facebook, MessageCircle, Save, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSiteSettings, useUpdateSiteSetting } from "@/hooks/useSiteSettings";
import { toast } from "sonner";

const SocialLinksManager = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const updateSetting = useUpdateSiteSetting();
  const [facebookUrl, setFacebookUrl] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");

  useEffect(() => {
    if (settings) {
      setFacebookUrl(settings.facebook_url || "");
      setDiscordUrl(settings.discord_url || "");
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: "facebook_url", value: facebookUrl.trim() }),
        updateSetting.mutateAsync({ key: "discord_url", value: discordUrl.trim() }),
      ]);
      toast.success("Közösségi linkek mentve!");
    } catch {
      toast.error("Hiba a mentés során!");
    }
  };

  if (isLoading) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-8">
      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        Közösségi linkek
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="facebook" className="flex items-center gap-2">
            <Facebook className="h-4 w-4" />
            Facebook oldal URL
          </Label>
          <Input
            id="facebook"
            value={facebookUrl}
            onChange={(e) => setFacebookUrl(e.target.value)}
            placeholder="https://facebook.com/az-oldalad"
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="discord" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Discord szerver URL
          </Label>
          <Input
            id="discord"
            value={discordUrl}
            onChange={(e) => setDiscordUrl(e.target.value)}
            placeholder="https://discord.gg/meghivo-kod"
            className="bg-background"
          />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-4">
        <Button
          onClick={handleSave}
          disabled={updateSetting.isPending}
          className="bg-primary hover:bg-primary/90 gap-2"
        >
          {updateSetting.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Mentés
        </Button>
        {facebookUrl && (
          <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ExternalLink className="h-3 w-3" /> Facebook
          </a>
        )}
        {discordUrl && (
          <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ExternalLink className="h-3 w-3" /> Discord
          </a>
        )}
      </div>
    </div>
  );
};

export default SocialLinksManager;
