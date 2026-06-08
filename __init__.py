import json

class MultiScenePrompt:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "common_prompt": ("STRING", {
                    "multiline": True,
                    "default": "",
                    "placeholder": "公用提示词",
                }),
                "scenes_json": ("STRING", {
                    "multiline": False,
                    "default": "[\"\"]",
                    "placeholder": "",
                }),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
            },
        }

    RETURN_TYPES = ("STRING", "STRING", "INT")
    RETURN_NAMES = ("scene_prompts", "common_prompt", "scene_count")
    FUNCTION = "execute"
    CATEGORY = "prompt"

    def execute(self, common_prompt, scenes_json, unique_id=None):
        try:
            scenes = json.loads(scenes_json)
        except (json.JSONDecodeError, TypeError):
            scenes = [""]

        combined = []
        for scene in scenes:
            combined.append(f"{common_prompt}{scene}")

        scene_prompts = json.dumps(combined, ensure_ascii=False)
        scene_count = len(scenes)

        return (scene_prompts, common_prompt, scene_count)


NODE_CLASS_MAPPINGS = {
    "MultiScenePrompt": MultiScenePrompt,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "MultiScenePrompt": "Multi-Scene Prompt Editor",
}

WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
