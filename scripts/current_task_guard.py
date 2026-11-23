"""Single source of truth for owner-directed mission task selection."""
from __future__ import annotations

ACTIVE_MISSION_TASK_ID = "P59-003"
PAUSED_REVENUE_TASK_ID = "P59-001"
BLOCKED_PRODUCT_TASK_ID = "P59-002"


def select_current_task(queue: dict, mission: dict):
    """Select only the owner-directed current mission task; never scan for a substitute."""
    if not isinstance(queue, dict) or not isinstance(mission, dict):
        return None, "CONTROL_STATE_INVALID"
    if mission.get("status") != "ACTIVE":
        return None, "MISSION_NOT_ACTIVE"
    policy = queue.get("queue_policy")
    if (queue.get("current_task") != ACTIVE_MISSION_TASK_ID
            or not isinstance(policy, dict)
            or policy.get("current_task") != ACTIVE_MISSION_TASK_ID
            or mission.get("current_task") != ACTIVE_MISSION_TASK_ID):
        return None, "CURRENT_TASK_AUTHORITY_MISMATCH"

    tasks = queue.get("tasks")
    if not isinstance(tasks, list):
        return None, "TASK_QUEUE_INVALID"
    records = {
        ACTIVE_MISSION_TASK_ID: [],
        PAUSED_REVENUE_TASK_ID: [],
        BLOCKED_PRODUCT_TASK_ID: [],
    }
    for record in tasks:
        if not isinstance(record, dict):
            return None, "TASK_RECORD_INVALID"
        task_id = record.get("id")
        if task_id in records:
            records[task_id].append(record)

    for task_id, matches in records.items():
        if len(matches) != 1:
            return None, f"TASK_RECORD_COUNT_INVALID:{task_id}"

    if records[PAUSED_REVENUE_TASK_ID][0].get("status") != "PAUSED":
        return None, "P59_001_MUST_REMAIN_PAUSED"
    if records[BLOCKED_PRODUCT_TASK_ID][0].get("status") != "BLOCKED":
        return None, "P59_002_MUST_REMAIN_BLOCKED"

    task = records[ACTIVE_MISSION_TASK_ID][0]
    if task.get("priority") != "P0":
        return None, "P59_003_PRIORITY_MISMATCH"
    if task.get("status") not in ("READY", "IN_PROGRESS"):
        return None, "P59_003_NOT_EXECUTABLE"
    if task.get("owner_gate") is not False:
        return None, "P59_003_OWNER_GATE_ACTIVE"

    dependencies = task.get("depends_on", [])
    if not isinstance(dependencies, list):
        return None, "P59_003_DEPENDENCY_SCHEMA_INVALID"
    for dependency in dependencies:
        matches = [item for item in tasks if item.get("id") == dependency]
        if len(matches) != 1 or matches[0].get("status") != "COMPLETED":
            return None, f"P59_003_DEPENDENCY_NOT_COMPLETED:{dependency}"

    return task, "CURRENT_TASK_SELECTED"
