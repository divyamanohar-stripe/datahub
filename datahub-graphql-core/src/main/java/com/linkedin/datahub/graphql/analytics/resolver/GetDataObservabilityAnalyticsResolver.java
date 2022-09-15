package com.linkedin.datahub.graphql.analytics.resolver;

import com.datahub.authentication.Authentication;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import com.linkedin.common.urn.Urn;
import com.linkedin.datahub.graphql.analytics.service.AnalyticsService;
import com.linkedin.datahub.graphql.generated.AnalyticsChart;
import com.linkedin.datahub.graphql.generated.AnalyticsChartGroup;
import com.linkedin.datahub.graphql.generated.Cell;
import com.linkedin.datahub.graphql.generated.DateInterval;
import com.linkedin.datahub.graphql.generated.DateRange;
import com.linkedin.datahub.graphql.generated.Entity;
import com.linkedin.datahub.graphql.generated.EntityProfileParams;
import com.linkedin.datahub.graphql.generated.LinkParams;
import com.linkedin.datahub.graphql.generated.NamedLine;
import com.linkedin.datahub.graphql.generated.Row;
import com.linkedin.datahub.graphql.generated.TableChart;
import com.linkedin.datahub.graphql.generated.TimeSeriesChart;
import com.linkedin.datahub.graphql.resolvers.ResolverUtils;
import com.linkedin.datahub.graphql.types.common.mappers.UrnToEntityMapper;
import graphql.schema.DataFetcher;
import graphql.schema.DataFetchingEnvironment;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.joda.time.DateTime;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * Retrieves the Data Observability charts to be rendered in the Analytics tab.
 */
@Slf4j
@RequiredArgsConstructor
public class GetDataObservabilityAnalyticsResolver implements DataFetcher<List<AnalyticsChartGroup>> {

    private final AnalyticsService _analyticsService;

    @Override
    public final List<AnalyticsChartGroup> get(DataFetchingEnvironment environment) throws Exception {
        Authentication authentication = ResolverUtils.getAuthentication(environment);
        return ImmutableList.of(AnalyticsChartGroup.builder()
                .setGroupId("DataObservabilityAnalytics")
                .setTitle("Data Observability Analytics")
                .setCharts(getDataObservabilityAnalyticsCharts(authentication))
                .build());
    }

    private List<AnalyticsChart> getDataObservabilityAnalyticsCharts(Authentication authentication) {
        final List<AnalyticsChart> charts = new ArrayList<>();
        final DateTime now = DateTime.now();
        final DateTime aWeekAgo = now.minusWeeks(1);
        final DateRange lastWeekDateRange = new DateRange(String.valueOf(aWeekAgo.getMillis()),
                String.valueOf(now.getMillis()));

        final DateTime oneMonthAgo = now.minusMonths(1);
        final DateRange oneMonthDateRange = new DateRange(String.valueOf(oneMonthAgo.getMillis()),
                String.valueOf(now.getMillis()));

        // Chart 1: Time Series Chart of users visiting the domain timeliness tab
        String domainTimelinessDaily = "Users visiting Domain Timeliness daily";
        DateInterval dailyInterval = DateInterval.DAY;
        String domainTimelinessEventType = "DomainTimelinessViewEvent";
        String domainTimelinessSegmentClickEventType = "DomainTimelinessSegmentClickEvent";

        final List<NamedLine> timeseries = _analyticsService.getTimeseriesChart(
                _analyticsService.getUsageIndexName(),
                oneMonthDateRange,
                dailyInterval,
                Optional.empty(),
                ImmutableMap.of("type", ImmutableList.of(domainTimelinessEventType)),
                Collections.emptyMap(),
                Optional.of("browserId"));
        charts.add(TimeSeriesChart.builder()
                .setTitle(domainTimelinessDaily)
                .setDateRange(oneMonthDateRange)
                .setInterval(dailyInterval)
                .setLines(timeseries)
                .build());

        // Chart 2: Table of top user explored segments
        final String topExploredTitle = "Top Explored Domain Segments";
        final List<String> columns = ImmutableList.of("Segment", "Count");

        final List<Row> topClickedSegments = _analyticsService.getTopNTableChart(_analyticsService.getUsageIndexName(),
                Optional.of(lastWeekDateRange),
                "segment.keyword", ImmutableMap.of("type", ImmutableList.of(domainTimelinessSegmentClickEventType)),
                Collections.emptyMap(),
                Optional.empty(), 10, GetDataObservabilityAnalyticsResolver::buildCellWithDomainSegment);
        charts.add(TableChart.builder().setTitle(topExploredTitle).setColumns(columns).setRows(topClickedSegments)
                .build());

        return charts;
    }

    public static Cell buildCellWithDomainSegment(String domainSegment) {
        String domainId = domainSegment.split(":")[0];
        Urn domainUrn = Urn.createFromTuple("domain", domainId);
        Cell result = new Cell();
        result.setValue(domainSegment);
        Entity entity = UrnToEntityMapper.map(domainUrn);
        result.setEntity(entity);
        result.setLinkParams(LinkParams.builder()
                .setEntityProfileParams(EntityProfileParams.builder().setUrn(domainUrn.toString()).setType(entity.getType()).build())
                .build());

        return result;
    }
}
