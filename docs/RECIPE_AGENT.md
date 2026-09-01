# Recipe Agent

## Purpose

The Recipe Agent is the repeatable workflow for adding or updating recipes in `moshestern/recipes` from any ChatGPT conversation.

The repository itself stores the agent's rules in `AGENTS.md`, so a new conversation does not need the historical context in which the site was originally built.

## How to invoke it from a new chat

A concise request is enough, for example:

```text
Use the Recipe Agent on GitHub repo moshestern/recipes.
Read AGENTS.md first, then add this recipe and create a PR.
```

Or in Hebrew:

```text
תפעיל את Recipe Agent על moshestern/recipes.
תקרא קודם את AGENTS.md, תוסיף את המתכון הבא ותיצור PR.
```

For an update:

```text
תפעיל את Recipe Agent על moshestern/recipes ותעדכן את המתכון חריימה:
...
```

For a recipe from another conversation, explicitly tell the agent which recipe to recover. If that conversation is available through personal context, it should retrieve it rather than reconstructing details from memory.

## Supported inputs

### 1. Recipe written in the current chat

The agent normalizes it directly into the repository schema.

### 2. Recipe from a previous ChatGPT conversation

The agent should retrieve the relevant prior conversation/context when available. If the exact recipe cannot be recovered, it must ask for the recipe text rather than inventing it.

### 3. External URL

The agent reads the source, extracts the factual recipe, rewrites it into the site's standardized format and keeps source metadata.

### 4. Existing recipe correction

The agent finds the recipe by title/id, applies the requested change, updates dependent references and validates the repository.

### 5. Finished-dish photograph

The image is used as the reference for generating a visually consistent recipe image. The final asset is converted to WebP and named using the existing recipe id.

If the active GitHub integration cannot upload binary files, the agent must provide the WebP separately and tell the user exactly where to upload it on the recipe branch:

```text
images/recipes/<recipe-id>.webp
```

The PR should remain open and clearly marked as waiting for that image until the file exists in the branch.

## Expected GitHub workflow

1. Read `AGENTS.md`.
2. Read the current `data/recipes.json`.
3. Make the smallest correct change.
4. Generate/prepare the image if needed.
5. Upload the image automatically when binary upload is supported; otherwise hand the WebP to the user with the exact branch/path and wait for the manual upload.
6. Run the validator.
7. Inspect the diff.
8. Create a branch such as:

```text
recipe/add-meat-sweet-potato-meatballs
```

9. Commit with a descriptive message.
10. Open a Pull Request.
11. Report the PR back to the user for review, including whether an image upload is still pending.

## Why PRs instead of direct push

The live site deploys from `main`. A Pull Request gives the user a final checkpoint before a recipe becomes public and lets GitHub Actions catch schema/reference errors first.

Once this workflow is trusted, direct-to-main updates can be considered, but PRs are the safer default.
