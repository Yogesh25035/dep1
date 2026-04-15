import os
import sys
from pathlib import Path

from django.apps import AppConfig
from django.conf import settings


def should_skip_startup_model_check():
    management_commands = {
        'makemigrations',
        'migrate',
        'collectstatic',
        'createsuperuser',
        'changepassword',
        'shell',
        'dbshell',
        'flush',
        'loaddata',
        'dumpdata',
        'test',
        'check',
    }
    return any(command in sys.argv for command in management_commands)


class IdsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ids'

    def ready(self):
        if os.getenv('MODEL_STARTUP_CHECK', 'True').lower() != 'true':
            return

        if settings.DEBUG or should_skip_startup_model_check():
            return

        model_dir = Path(settings.BASE_DIR) / 'ml_models'
        required_files = [
            model_dir / 'rf_model_v3.pkl',
            model_dir / 'scaler.pkl',
        ]
        missing = [str(path) for path in required_files if not path.exists()]

        if missing:
            raise RuntimeError(
                'Startup check failed. Missing model artifacts: ' + ', '.join(missing)
            )
