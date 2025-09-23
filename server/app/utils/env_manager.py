"""Environment file management utilities"""

import os
import re
from pathlib import Path
from typing import Dict, Optional
import structlog

logger = structlog.get_logger(__name__)

class EnvManager:
    """Manages .env file operations for storing API keys securely"""

    def __init__(self, env_file_path: Optional[str] = None):
        if env_file_path is None:
            # Default to .env file in server root
            self.env_file_path = Path(__file__).parent.parent.parent / ".env"
        else:
            self.env_file_path = Path(env_file_path)

        logger.info(f"EnvManager initialized with env file: {self.env_file_path}")

    def read_env_file(self) -> Dict[str, str]:
        """Read all environment variables from .env file"""
        env_vars = {}

        if not self.env_file_path.exists():
            logger.warning(f".env file not found at {self.env_file_path}")
            return env_vars

        try:
            with open(self.env_file_path, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()

                    # Skip empty lines and comments
                    if not line or line.startswith('#'):
                        continue

                    # Parse KEY=VALUE format
                    if '=' in line:
                        key, value = line.split('=', 1)
                        key = key.strip()
                        value = value.strip()

                        # Remove quotes if present
                        if value.startswith('"') and value.endswith('"'):
                            value = value[1:-1]
                        elif value.startswith("'") and value.endswith("'"):
                            value = value[1:-1]

                        env_vars[key] = value
                    else:
                        logger.warning(f"Invalid line format at line {line_num}: {line}")

            logger.debug(f"Read {len(env_vars)} environment variables from .env file")
            return env_vars

        except Exception as e:
            logger.error(f"Failed to read .env file: {str(e)}")
            return {}

    def update_env_variables(self, updates: Dict[str, str]) -> bool:
        """Update specific environment variables in .env file"""
        try:
            # Read current content
            current_env = self.read_env_file()

            # Update with new values
            current_env.update(updates)

            # Write back to file
            return self.write_env_file(current_env)

        except Exception as e:
            logger.error(f"Failed to update environment variables: {str(e)}")
            return False

    def write_env_file(self, env_vars: Dict[str, str]) -> bool:
        """Write environment variables to .env file"""
        try:
            # Create backup if file exists
            if self.env_file_path.exists():
                backup_path = self.env_file_path.with_suffix('.env.backup')
                with open(self.env_file_path, 'r') as src, open(backup_path, 'w') as dst:
                    dst.write(src.read())
                logger.info(f"Created backup at {backup_path}")

            # Write new content
            with open(self.env_file_path, 'w', encoding='utf-8') as f:
                f.write("# KIS Open API Configuration\n")
                f.write("# Generated and updated by volatility trading system\n\n")

                # Group related variables
                kis_vars = {k: v for k, v in env_vars.items() if k.startswith('KIS_')}
                other_vars = {k: v for k, v in env_vars.items() if not k.startswith('KIS_')}

                # Write KIS variables first
                if kis_vars:
                    f.write("# KIS API Settings\n")
                    for key, value in sorted(kis_vars.items()):
                        f.write(f'{key}="{value}"\n')
                    f.write("\n")

                # Write other variables
                if other_vars:
                    f.write("# Other Settings\n")
                    for key, value in sorted(other_vars.items()):
                        f.write(f'{key}="{value}"\n')

            logger.info(f"Successfully wrote {len(env_vars)} environment variables to .env file")
            return True

        except Exception as e:
            logger.error(f"Failed to write .env file: {str(e)}")
            return False

    def save_kis_api_keys(self, app_key: str, app_secret: str) -> bool:
        """Save KIS API keys to .env file"""
        try:
            updates = {
                'KIS_APP_KEY': app_key,
                'KIS_APP_SECRET': app_secret
            }

            success = self.update_env_variables(updates)

            if success:
                logger.info("KIS API keys successfully saved to .env file")
                # Reload environment variables for current process
                os.environ.update(updates)
            else:
                logger.error("Failed to save KIS API keys to .env file")

            return success

        except Exception as e:
            logger.error(f"Error saving KIS API keys: {str(e)}")
            return False

    def get_kis_api_keys(self) -> Dict[str, Optional[str]]:
        """Get current KIS API keys from environment"""
        return {
            'app_key': os.getenv('KIS_APP_KEY'),
            'app_secret': os.getenv('KIS_APP_SECRET')
        }

# Global instance
env_manager = EnvManager()