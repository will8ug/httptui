---
name: apply-openspec-customization
description: Apply the subagent dispatch customization to openspec-apply-change skill. Run this after upgrading OpenSpec Skills to restore the parallel dispatch behavior for independent tasks.
---

Apply the subagent dispatch customization to `openspec-apply-change` skill.

**Context**: After upgrading OpenSpec Skills, the `openspec-apply-change/SKILL.md` gets overwritten with the stock version. This command restores the customization that enables parallel dispatch of independent tasks to subagents.

**Steps**:

1. **Read the current skill file**
   ```bash
   cat .opencode/skills/openspec-apply-change/SKILL.md
   ```

2. **Check if customization is already applied**
   Look for these markers in the file:
   - `6. **Implement tasks (with parallel dispatch for independent tasks)**`
   - `- **Parallel dispatch**:` in Guardrails section
   
   If both exist, report "Customization already applied" and stop.

3. **Apply the customization**
   
   Replace this section (step 6 and its Pause conditions):
   ```
   6. **Implement tasks (loop until done or blocked)**

      For each pending task:
      - Show which task is being worked on
      - Make the code changes required
      - Keep changes minimal and focused
      - Mark task complete in the tasks file: `- [ ]` → `- [x]`
      - Continue to next task

      **Pause if:**
      - Task is unclear → ask for clarification
      - Implementation reveals a design issue → suggest updating artifacts
      - Error or blocker encountered → report and wait for guidance
      - User interrupts
   ```
   
   With this expanded version:
   ```
   6. **Implement tasks (with parallel dispatch for independent tasks)**

      **Analyze task dependencies first:**
      - Read all pending tasks and identify dependencies between them
      - Tasks are **independent** if they modify different files/modules and don't depend on each other's output
      - Tasks are **dependent** if one requires the other's result, or they modify the same files

      **If 2+ independent tasks exist → dispatch to subagents in parallel:**
      ```
      task(
        category="unspecified-high",  // or "unspecified-low" for simpler tasks
        load_skills=[],
        run_in_background=true,
        description="Implement task: <task description>",
        prompt="Implement this specific task from the OpenSpec change:
      
      **Change:** <change-name>
      **Task:** <full task description>
      **Context files:** <list relevant context files>
      
      **Requirements:**
      - Make minimal, focused code changes for this task only
      - Follow existing code patterns and conventions
      - Mark task complete in tasks file: `- [ ]` → `- [x]`
      - Return: Summary of changes made and any issues encountered
      
      **Do NOT:**
      - Modify files outside this task's scope
      - Change other tasks in the list
      - Refactor unrelated code"
      )
      ```
      
      Dispatch all independent tasks simultaneously, then wait for completion notifications.
      
      **For dependent tasks or single tasks → implement directly:**
      - Show which task is being worked on
      - Make the code changes required
      - Keep changes minimal and focused
      - Mark task complete in the tasks file: `- [ ]` → `- [x]`
      - Continue to next task

      **After subagent completion:**
      - Collect results via `background_output(task_id="...")`
      - Verify each task was marked complete
      - Check for conflicts between parallel changes
      - Report any issues that need attention

      **Pause if:**
      - Task is unclear → ask for clarification
      - Implementation reveals a design issue → suggest updating artifacts
      - Error or blocker encountered → report and wait for guidance
      - User interrupts
      - Subagent reports failure → review and decide next steps
   ```

4. **Add guardrails**
   
   In the Guardrails section, after the line:
   ```
   - Use contextFiles from CLI output, don't assume specific file names
   ```
   
   Add these two lines:
   ```
   - **Parallel dispatch**: When 2+ tasks are independent (different files, no dependencies), dispatch to subagents simultaneously for faster execution
   - **Verify subagent work**: After subagents complete, verify tasks were marked complete and check for conflicts
   ```

5. **Verify the changes**
   Read the file again and confirm:
   - Step 6 title contains "with parallel dispatch for independent tasks"
   - Guardrails section contains "Parallel dispatch" and "Verify subagent work"
   
   Report: "Customization applied successfully"
