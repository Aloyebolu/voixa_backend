CREATE TABLE profile_views (
  id SERIAL PRIMARY KEY,
  profile_owner_id VARCHAR(255) NOT NULL,
  viewer_id VARCHAR(255) NOT NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_profile_owner FOREIGN KEY (profile_owner_id) REFERENCES users(id),
  CONSTRAINT fk_viewer FOREIGN KEY (viewer_id) REFERENCES users(id)
);
