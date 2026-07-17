/**
 * Plainly landing-page templates the user can copy into a new repo.
 *
 * Empty for now — the "Create from a template" section on the home page is
 * hidden while this list has no `featured` entries. Add Plainly's own starters
 * here (each: name, repository "owner/repo", suggested default name, featured,
 * thumbnail path, and an inline SVG icon string) to light the feature back up.
 */

type Template = {
  name: string;
  repository: string;
  suggested: string;
  featured?: boolean;
  thumbnail?: string;
  icon?: string;
};

const templates: Template[] = [];

export default templates;
