import { GithubIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const REPO_BASE_URL =
  'https://github.com/membranehq/playground/tree/main/src';

export const OpenGhButton = ({
  metaUrl,
  className,
}: {
  metaUrl: string;
  className?: string;
}) => {
  const filePath = metaUrl.split('/src')[1];
  const fullUrl = `${REPO_BASE_URL}${filePath}`;

  // When the app is built, any URLs passed are escaped by default (prod env).
  // To have it encoded (but on a non-encoded URI), unescape is done, to
  // normalize the URI for both cases. The dev will not change, as it will
  // not have anything to escape, therefore will produce the same result.
  const normalizedUrl = decodeURI(fullUrl);

  const urlToOpen = encodeURI(normalizedUrl);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant='outline'
          size='icon-sm'
          asChild
          disabled={!filePath}
          className={className}
        >
          <a href={urlToOpen} target='_blank'>
            <GithubIcon />
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Open on GitHub</TooltipContent>
    </Tooltip>
  );
};
