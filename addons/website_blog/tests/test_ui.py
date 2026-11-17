# -*- coding: utf-8 -*-
# Part of WETH. See LICENSE file for full copyright and licensing details.

import weth.tests
import re
from weth.addons.http_routing.tests.common import MockRequest
from weth.addons.website_blog.controllers.main import WebsiteBlog
from weth.addons.website_blog.tests.common import TestWebsiteBlogCommon
from datetime import datetime


@weth.tests.tagged('post_install', '-at_install')
class TestWebsiteBlogUi(weth.tests.HttpCase, TestWebsiteBlogCommon):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        blog = cls.env['blog.blog'].create({
            "name": 'aaa Blog Test',
            "subtitle": 'Blog Test Subtitle',
            "cover_properties": """{"background-image": "url('/website_blog/static/src/img/blog_1.webp')", "resize_class": "o_record_has_cover o_half_screen_height", "opacity": "0.4"}""",
        })

        cls.blog_tags = cls.env['blog.tag'].create([{'name': "Tour Tag 1"}, {'name': "Tour Tag 2"}])
        cls.blog_post = cls.env['blog.post'].create({
            "name": "Post Test",
            "subtitle": "Subtitle Test",
            "blog_id": blog.id,
            "author_id": cls.env.user.partner_id.id,
            "tag_ids": [(4, cls.blog_tags[0].id)],
            "is_published": True,
            "cover_properties": """{"background-image": "url('/website_blog/static/src/img/cover_1.webp')", "resize_class": "o_record_has_cover o_half_screen_height", "opacity": "0"}""",
        })





    def test_blog_social_image(self):
        with MockRequest(self.env, website=self.env.ref('base.default_website'), url_root='http://example.com'):
            meta = self.blog_post.get_website_meta()
            self.assertEqual(meta['opengraph_meta']['og:image'], 'http://example.com/website_blog/static/src/img/cover_1.webp')
            self.assertEqual(meta['twitter_meta']['twitter:image'], 'http://example.com/website_blog/static/src/img/cover_1.webp')
            self.blog_post.cover_properties = """{"background-image": "url(\\"/2.webp\\")"}"""
            meta = self.blog_post.get_website_meta()
            self.assertEqual(meta['opengraph_meta']['og:image'], 'http://example.com/2.webp')
            self.assertEqual(meta['twitter_meta']['twitter:image'], 'http://example.com/2.webp')
            self.blog_post.cover_properties = """{"background-image": "url(/3.webp)"}"""
            meta = self.blog_post.get_website_meta()
            self.assertEqual(meta['opengraph_meta']['og:image'], 'http://example.com/3.webp')
            self.assertEqual(meta['twitter_meta']['twitter:image'], 'http://example.com/3.webp')

    def test_avatar_comment(self):
        mail_message = self.env['mail.message'].create({
            'author_id': self.user_public.partner_id.id,
            'model': self.test_blog_post._name,
            'res_id': self.test_blog_post.id,
            'subtype_id': self.ref('mail.mt_comment'),
        })
        portal_message = mail_message.portal_message_format()
        response = self.url_open(
            f"/web/image/res.partner/{self.user_public.partner_id.id}/avatar_128?access_token={portal_message[0]['author_id']['avatar_128_access_token']}",
        )
        # Ensure that the avatar is visible
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get('Content-Type'), 'image/svg+xml; charset=utf-8')
        self.assertRegex(response.headers.get('Content-Disposition', ''), fr'{self.user_public.partner_id.name}.svg')


    def test_sidebar_tags_are_filtered_by_blog_scope(self):
        Blog = self.env['blog.blog']
        Post = self.env['blog.post']
        Tag = self.env['blog.tag']
        TagCategory = self.env['blog.tag.category']

        category = TagCategory.create({'name': 'Scoped Category'})
        used_tag = Tag.create({'name': 'Scoped Used Tag', 'category_id': category.id})
        unused_tag = Tag.create({'name': 'Scoped Unused Tag', 'category_id': category.id})
        other_blog_tag = Tag.create({'name': 'Scoped Other Blog Tag', 'category_id': category.id})

        blog = Blog.create({'name': 'Scoped Blog'})
        other_blog = Blog.create({'name': 'Scoped Other Blog'})
        Post.create({
            'name': 'Scoped Blog Post',
            'blog_id': blog.id,
            'author_id': self.env.user.partner_id.id,
            'tag_ids': [(4, used_tag.id)],
            'is_published': True,
        })
        Post.create({
            'name': 'Scoped Other Blog Post',
            'blog_id': other_blog.id,
            'author_id': self.env.user.partner_id.id,
            'tag_ids': [(4, other_blog_tag.id)],
            'is_published': True,
        })

        self.env.ref('website_blog.opt_blog_sidebar_show').active = True
        # Activate tags in sidebar
        self.env.ref("website_blog.opt_sidebar_blog_index_tags").active = True
        response = self.url_open(blog.website_url)

        self.assertIn(category.name, response.text)
        self.assertIn(used_tag.name, response.text)
        self.assertNotIn(unused_tag.name, response.text)
        self.assertNotIn(other_blog_tag.name, response.text)




    def test_next_article(self):
        blog1, blog2 = self.env['blog.blog'].create([
            {'name': "Blog Test"},
            {'name': "Blog Test 2", 'website_id': self.env['website'].create({'name': 'Website Test 2'}).id},
        ])
        post1, post2, post3, post4, post5, post6 = self.env['blog.post'].create([
            {'name': "Post Test 1", 'blog_id': blog1.id, 'is_published': True},
            {'name': "Post Test 2", 'blog_id': blog1.id, 'is_published': True},
            {'name': "Post Test 3", 'blog_id': blog1.id, 'is_published': False},
            {'name': "Post Test 4", 'blog_id': blog1.id, 'is_published': True},
            {'name': "Post Test 5", 'blog_id': blog1.id, 'is_published': True},
            {'name': "Post Test 6", 'blog_id': blog2.id, 'is_published': True},
        ])
        post2.recommended_next_post_id = post4
        post4.recommended_next_post_id = post3
        post5.recommended_next_post_id = post6

        website = self.env.ref('base.default_website')
        controller = WebsiteBlog()

        cases = [(self.env, post1, post5, "Next post should be Post5 according to chronological order"),
            (self.env, post2, post4, "Next post should be Post4 as it is set manually"),
            (self.env(user=self.env.ref('base.public_user')), post4, post2, "Fallback to next published post when recommended post is not published"),
            (self.env, post5, post4, "Next post should be Post4 as Post6 is not in the same blog")]

        for env, current_post, expected_post, message in cases:
            with MockRequest(env, website=website) as mock_request:
                def fake_render(_, values):
                    self.assertEqual(values['next_post'], expected_post, message)

                mock_request.session.touch = lambda: None
                mock_request.render = fake_render
                controller.blog_post(
                    blog1.with_env(mock_request.env),
                    current_post.with_env(mock_request.env),
                )
