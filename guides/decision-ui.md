# Decision UI (MANDATORY)

All user decisions MUST use AskUserQuestion. Never ask the user to type
answers manually. This applies to every choice point in the workflow:

| Decision Point | AskUserQuestion Format |
|---------------|----------------------|
| Smart Entry menu | `header: "Action"`, options: init/update/sync + recommended |
| Design type confirmation | `header: "Design Type"`, options: Web/iOS/Android/Desktop |
| Conflict resolution | `header: "Resolve"`, options: adapt-code/adapt-design/proceed/cancel |
| MCP setup | `header: "MCP Setup"`, options: "Auto-configure"/"Skip" |
| Tech stack choices | `header: "Framework"`, options: detected frameworks |
| Gap decisions | `header: "Auth"`, options: NextAuth/Clerk/Custom/None |
| Skill recommendations | `header: "Install"`, options: install/skip per skill |
| Step confirmation | `header: "Continue"`, options: "Confirm & Next"/"Modify" |

**Rule:** If the user needs to make a choice, use AskUserQuestion. If the user
needs to confirm output, use AskUserQuestion. Never fall back to "type your
answer".